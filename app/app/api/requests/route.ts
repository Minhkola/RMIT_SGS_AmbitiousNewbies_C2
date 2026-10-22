import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getClaims, username } from '@/lib/auth'
import { CCTV_VIEWER_ROLE } from '@/lib/config'
import {
  appendAudit,
  getClipList,
  getRequests,
  getStoredClip,
  saveRequest,
  updateRequest,
} from '@/lib/store'
import { getQuorumState, proposeRoleGrant } from '@/lib/tcAdmin'
import { DEMO_PERSONAS, type BoardVote, type QuorumState, type ViewRequest } from '@/lib/types'

export const dynamic = 'force-dynamic'

// POST: file a video review request (or simulate a rogue admin self-grant attempt).
export async function POST(req: NextRequest) {
  const claims = await getClaims(req)
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    clipId?: string
    reason?: string
    source?: 'ui' | 'assistant' | 'self-grant-attempt'
    isRogueAdminAttempt?: boolean
  }

  const isRogue = Boolean(body.isRogueAdminAttempt)
  const clipId = body.clipId || 'clip-L12-2143'
  const clip = getStoredClip(clipId)
  if (!clip) return NextResponse.json({ error: 'Selected camera clip does not exist.' }, { status: 400 })

  const reason = isRogue
    ? 'SILENT ADMIN OVERRIDE: Attempting direct self-assignment of cctv-viewer role without resident notice.'
    : (body.reason || '').toString().trim()

  if (!isRogue && reason.length < 5) {
    return NextResponse.json(
      { error: 'Please provide a clear public justification (at least 5 characters).' },
      { status: 400 },
    )
  }

  const grant = await proposeRoleGrant(claims.sub, CCTV_VIEWER_ROLE)

  const who = username(claims)
  const displayName = (claims.displayName as string) || who
  const roleTitle = (claims.roleTitle as string) || 'Resident'

  const request: ViewRequest = {
    id: `req-${Date.now().toString(36)}`,
    requester: who,
    requesterDisplayName: displayName,
    requesterRole: roleTitle,
    requesterUserId: claims.sub,
    camera: clip.camera,
    zone: clip.zone,
    clipId: clip.clipId,
    from: clip.from,
    to: clip.to,
    reason,
    createdAt: new Date().toISOString(),
    crId: grant.crId,
    status: 'PENDING_QUORUM',
    source: isRogue ? 'self-grant-attempt' : body.source === 'assistant' ? 'assistant' : 'ui',
    isRogueAdminAttempt: isRogue,
    votes: [],
    viewedAt: null,
  }
  saveRequest(request)

  if (isRogue) {
    appendAudit({
      actor: displayName,
      actorRole: roleTitle,
      action: 'ADMIN_BLOCKED',
      detail: `Rogue self-grant of 'cctv-viewer' for ${clip.clipId} intercepted by TideCloak IGA (0/2 Board Quorum).`,
      humanExplanation:
        'The IT Systems Engineer tried to grant themselves video decryption rights. TideCloak captured and froze the action as an unapproved Change Request.',
      requestId: request.id,
      crId: grant.crId,
    })
  } else {
    appendAudit({
      actor: displayName,
      actorRole: roleTitle,
      action: 'REQUESTED',
      detail: `Filed public request to review ${clip.clipId} (${clip.camera}) — Reason: "${reason}"`,
      humanExplanation:
        'This request is now visible to the entire community and awaits 2/3 Building Board signatures before decryption is possible.',
      requestId: request.id,
      crId: grant.crId,
    })
  }

  return NextResponse.json({ request, grant })
}

// PATCH: Board Member casts an enclave signature (APPROVE or DENY) on a pending request.
export async function PATCH(req: NextRequest) {
  const claims = await getClaims(req)
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as {
    requestId?: string
    decision?: 'APPROVE' | 'DENY'
    signerUsername?: string
  }

  if (!body.requestId || !body.decision) {
    return NextResponse.json({ error: 'Missing requestId or decision' }, { status: 400 })
  }

  const signerPersona =
    DEMO_PERSONAS.find((p) => p.username === (body.signerUsername || claims.preferred_username)) ||
    DEMO_PERSONAS.find((p) => p.username === claims.preferred_username)

  if (!signerPersona || !signerPersona.isBoardMember) {
    return NextResponse.json(
      {
        error: 'GOVERNANCE_VIOLATION',
        detail:
          'Only elected Building Board Members (Elena Rostova or David Chen) can co-sign video access requests. IT Admins and Residents cannot self-approve.',
      },
      { status: 403 },
    )
  }

  const all = getRequests()
  const target = all.find((r) => r.id === body.requestId)
  if (!target) return NextResponse.json({ error: 'Request not found' }, { status: 404 })

  const existingVotes = target.votes ?? []
  if (existingVotes.some((v) => v.username === signerPersona.username)) {
    return NextResponse.json(
      {
        error: 'ALREADY_SIGNED',
        detail: `${signerPersona.displayName} has already signed this Change Request. Quorum requires a second, independent Board Member.`,
      },
      { status: 409 },
    )
  }

  const sigHash =
    '0x' +
    crypto
      .createHash('sha256')
      .update(`${target.id}:${signerPersona.username}:${body.decision}:${Date.now()}`)
      .digest('hex')
      .slice(0, 24)

  const newVote: BoardVote = {
    username: signerPersona.username,
    displayName: signerPersona.displayName,
    roleLabel: signerPersona.roleTitle,
    decision: body.decision,
    timestamp: new Date().toISOString(),
    signatureHash: sigHash,
  }

  const updatedVotes = [...existingVotes, newVote]
  const approvals = updatedVotes.filter((v) => v.decision === 'APPROVE')
  const denials = updatedVotes.filter((v) => v.decision === 'DENY')

  let newStatus = target.status
  if (denials.length > 0) {
    newStatus = 'DENIED'
  } else if (approvals.length >= 2) {
    newStatus = 'APPROVED'
  }

  const updated = updateRequest(target.id, { votes: updatedVotes, status: newStatus })!

  appendAudit({
    actor: signerPersona.displayName,
    actorRole: signerPersona.roleTitle,
    action: body.decision === 'DENY' ? 'DENIED' : 'BOARD_SIGNED',
    detail:
      body.decision === 'DENY'
        ? `Board Member vetoed Change Request ${target.crId} for ${target.clipId}.`
        : `Signed enclave approval (${approvals.length}/2) on CR ${target.crId} [Sig: ${sigHash}]`,
    humanExplanation:
      approvals.length >= 2
        ? '2/3 Building Board Quorum achieved! TideCloak has committed the temporary cctv-viewer decryption role.'
        : '1 of 2 required Board signatures collected. The video remains cryptographically locked until a second Board Member co-signs.',
    requestId: target.id,
    crId: target.crId,
  })

  if (newStatus === 'APPROVED') {
    appendAudit({
      actor: 'TideCloak Fabric (Threshold 2/3)',
      actorRole: 'Decentralized Quorum Authority',
      action: 'APPROVED',
      detail: `Quorum reached (2/2 signatures: ${approvals.map((a) => a.displayName).join(' + ')}) → Committed role 'cctv-viewer' for ${target.clipId}.`,
      humanExplanation:
        'Because 2 independent Board Members co-signed, the requester can now decrypt and view this specific camera clip in their browser.',
      requestId: target.id,
      crId: target.crId,
    })
  }

  const quorum = await getQuorumState(updated.crId, updated)
  return NextResponse.json({ request: { ...updated, quorum } })
}

// GET: list requests, each enriched with LIVE quorum state.
export async function GET(req: NextRequest) {
  const claims = await getClaims(req)
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const requests = getRequests()
  const withQuorum = await Promise.all(
    requests.map(async (r) => {
      const quorum: QuorumState = await getQuorumState(r.crId, r)
      let status = r.status
      if (quorum.committed && status === 'PENDING_QUORUM') {
        status = 'APPROVED'
        updateRequest(r.id, { status })
      } else if (quorum.crStatus === 'DENIED' && status !== 'DENIED') {
        status = 'DENIED'
        updateRequest(r.id, { status })
      }
      return { ...r, status, quorum }
    }),
  )

  return NextResponse.json({ requests: withQuorum, clips: getClipList() })
}
