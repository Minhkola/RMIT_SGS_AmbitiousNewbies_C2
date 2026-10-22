import { NextRequest, NextResponse } from 'next/server'
import { getClaims } from '@/lib/auth'
import { getClipList } from '@/lib/store'

export const dynamic = 'force-dynamic'

// Clip CATALOG (metadata only). Anyone logged in can see that a clip exists,
// which camera and window it covers — but never its contents.
export async function GET(req: NextRequest) {
  const claims = await getClaims(req)
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ clips: getClipList() })
}
