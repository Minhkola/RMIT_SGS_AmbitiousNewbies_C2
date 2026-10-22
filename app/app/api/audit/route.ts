import { NextRequest, NextResponse } from 'next/server'
import { getClaims } from '@/lib/auth'
import { getAudit } from '@/lib/store'

export const dynamic = 'force-dynamic'

// Public (to any logged-in user) activity log. The app-level mirror of what
// happened; the source of truth for approvals is TideCloak's change-request log.
export async function GET(req: NextRequest) {
  const claims = await getClaims(req)
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ audit: getAudit() })
}
