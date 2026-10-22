import { NextRequest, NextResponse } from 'next/server'
import { getClaims } from '@/lib/auth'
import { getEvents } from '@/lib/store'

export const dynamic = 'force-dynamic'

// Event metadata — the only thing the AI ever reads. No footage here.
export async function GET(req: NextRequest) {
  const claims = await getClaims(req)
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const type = url.searchParams.get('type')
  const camera = url.searchParams.get('camera')

  let events = getEvents()
  if (type) events = events.filter((e) => e.type === type)
  if (camera) events = events.filter((e) => e.camera === camera)

  return NextResponse.json({ events, total: events.length })
}
