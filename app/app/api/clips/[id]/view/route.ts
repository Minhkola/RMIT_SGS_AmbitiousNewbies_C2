import { NextRequest, NextResponse } from 'next/server'
import { getClaims, requireRole, username } from '@/lib/auth'
import { CCTV_VIEWER_ROLE } from '@/lib/config'
import { appendAudit, getRequests, getStoredClip, updateRequest } from '@/lib/store'
import { openJSON } from '@/lib/crypto'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const stored = getStoredClip(id)
  if (!stored) return NextResponse.json({ error: 'Clip not found' }, { status: 404 })

  const { clipId, camera, zone, from, to, scene, frames: frameCount, label, humanSummary, plate_masked } = stored
  const clipMeta = { clipId, camera, zone, from, to, scene, frames: frameCount, label, humanSummary, plate_masked }

  const claims = await requireRole(req, [CCTV_VIEWER_ROLE], id)
  if (!claims) {
    const rawClaims = await getClaims(req)
    const callerName = (rawClaims?.displayName as string) || (rawClaims ? username(rawClaims) : 'Anonymous')
    const callerRole = (rawClaims?.roleTitle as string) || 'Unverified Role'

    appendAudit({
      actor: callerName,
      actorRole: callerRole,
      action: 'DENIED',
      detail: `Rejected attempt to decrypt ${clipId} (${camera}) — caller lacks committed 2/3 Board Quorum & 'cctv-viewer' authority.`,
      humanExplanation:
        'Someone tried to open the video player before 2 of 3 Building Board members co-signed the request. Only unreadable AES-GCM-256 ciphertext remains on disk.',
      crId: null,
    })

    return NextResponse.json(
      {
        error: 'NO_DECRYPTION_AUTHORITY',
        code: 'HTTP_403_QUORUM_REQUIRED',
        detail:
          'Your identity does not hold the active "cctv-viewer" decryption role for this clip. In CamGuard, raw footage remains sealed in AES-GCM-256 ciphertext until at least 2 of 3 Building Board members co-sign a public Change Request in TideCloak.',
        caller: rawClaims?.preferred_username || 'guest',
        callerDisplayName: callerName,
        callerRoles: rawClaims?.realm_access?.roles || [],
        clip: clipMeta,
        ciphertextPreview: {
          alg: stored.alg,
          ivHex: stored.iv,
          byteLength: stored.cipher.length,
          sampleHex: stored.cipher.slice(0, 140),
        },
      },
      { status: 403 },
    )
  }

  let frames: string[]
  try {
    frames = openJSON<string[]>({ iv: stored.iv, cipher: stored.cipher })
  } catch {
    return NextResponse.json({ error: 'Decryption failed (key mismatch)' }, { status: 500 })
  }

  const who = (claims.displayName as string) || username(claims)
  const roleTitle = (claims.roleTitle as string) || 'Authorized Viewer'

  const matchingReq = getRequests().find(
    (r) => r.clipId === id && (r.status === 'APPROVED' || r.status === 'VIEWED') && !r.isRogueAdminAttempt,
  )
  if (matchingReq && matchingReq.status !== 'VIEWED') {
    updateRequest(matchingReq.id, { status: 'VIEWED', viewedAt: new Date().toISOString() })
  }

  appendAudit({
    actor: who,
    actorRole: roleTitle,
    action: 'VIEWED',
    detail: `Decrypted & viewed ${stored.clipId} (${stored.camera} · ${stored.zone}) under committed 2/3 Board Quorum.`,
    humanExplanation:
      'Every authorized playback is permanently recorded in the public ledger so residents know exactly who viewed which clip and why.',
    requestId: matchingReq?.id,
    crId: matchingReq?.crId ?? null,
  })

  return NextResponse.json({
    status: 'UNLOCKED',
    clip: clipMeta,
    frames,
    viewedBy: who,
    viewedByRole: roleTitle,
    quorumRequest: matchingReq || null,
  })
}
