import { NextRequest, NextResponse } from 'next/server'
import { getClaims, username } from '@/lib/auth'
import { appendAudit, getClipList, getEvents } from '@/lib/store'
import { runAssistant } from '@/lib/assistant'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const claims = await getClaims(req)
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { message?: string }
  const message = (body.message || '').toString().slice(0, 1000)
  if (!message.trim()) return NextResponse.json({ error: 'Empty message' }, { status: 400 })

  const reply = runAssistant(message, getEvents(), getClipList())
  const actorName = (claims.displayName as string) || username(claims)
  const actorRole = (claims.roleTitle as string) || 'Authenticated User'

  if (reply.attemptedFootage) {
    appendAudit({
      actor: actorName,
      actorRole,
      action: 'AI_DENIED',
      detail: reply.injectionDetected
        ? `Prompt injection tricked AI into requesting raw clip → Blocked by NO_DECRYPTION_AUTHORITY`
        : `User asked AI to open raw footage → Blocked by NO_DECRYPTION_AUTHORITY`,
      humanExplanation:
        'Even though the AI attempted to call decryptVideoStream(), the vault rejected it because the AI service account holds zero decryption keys.',
    })
  } else {
    appendAudit({
      actor: actorName,
      actorRole,
      action: 'AI_ANSWERED',
      detail: `AI Concierge answered sensor metadata query: "${message.slice(0, 72)}"`,
      humanExplanation:
        'Answered strictly using anonymized IoT sensor logs (counts & timestamps) without touching encrypted video.',
    })
  }

  return NextResponse.json(reply)
}
