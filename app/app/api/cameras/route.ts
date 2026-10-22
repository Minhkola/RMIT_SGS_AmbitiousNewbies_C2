import { NextRequest, NextResponse } from 'next/server'
import { getClaims } from '@/lib/auth'
import { getCameras } from '@/lib/store'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const claims = await getClaims(req)
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ cameras: getCameras() })
}
