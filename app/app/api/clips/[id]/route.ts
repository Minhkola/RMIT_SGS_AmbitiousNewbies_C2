import { NextRequest, NextResponse } from 'next/server'
import { getClaims } from '@/lib/auth'
import { getStoredClip } from '@/lib/store'

export const dynamic = 'force-dynamic'

// What the server (and the AI, and a snooping admin reading the DB) can ever
// get: ciphertext + IV + metadata. There is NO code path here that returns
// plaintext. Decryption lives behind the quorum gate in ./view.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const claims = await getClaims(req)
  if (!claims) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const clip = getStoredClip(id)
  if (!clip) return NextResponse.json({ error: 'Clip not found' }, { status: 404 })

  const { clipId, camera, zone, from, to, scene, frames, label, plate_masked, alg, iv, cipher } = clip
  return NextResponse.json({
    clip: { clipId, camera, zone, from, to, scene, frames, label, plate_masked },
    sealed: { alg, iv, cipher },
    note: 'Ciphertext only. Plaintext requires the cctv-viewer role granted by board quorum.',
  })
}
