// Server-side AES-GCM for clip confidentiality (Plan B).
//
// WHY THIS, AND NOT TIDE E2EE, FOR THE CLIP BYTES:
//   Tide self-encryption (doEncrypt/doDecrypt) is permanently user-bound — only
//   the encryptor can decrypt — so it cannot let an *approved viewer* read a
//   clip someone else ingested. True cross-user decryption needs Forseti VVK
//   policy encryption, which is deployed by the Tide team (not self-service).
//   So here the clip is sealed with a symmetric key and the RELEASE of plaintext
//   is gated by the Fabric-signed, quorum-granted `cctv-viewer` role
//   (api/clips/[id]/view). The production hardening is Forseti VVK so the server
//   never holds the key either — documented in the README.
//
// The key comes from CLIP_MASTER_KEY_B64 (32 bytes, base64). With no env var we
// derive a *dev-only* key by hashing a fixed passphrase so clips seeded on first
// run stay decryptable across restarts. That default is intentionally insecure
// and must be overridden in any real deployment.
import crypto from 'crypto'

function clipKey(): Buffer {
  const b64 = process.env.CLIP_MASTER_KEY_B64
  if (b64) {
    const buf = Buffer.from(b64, 'base64')
    if (buf.length !== 32) {
      throw new Error('CLIP_MASTER_KEY_B64 must decode to exactly 32 bytes')
    }
    return buf
  }
  // Dev fallback: deterministic 32-byte key. NOT for production.
  return crypto.createHash('sha256').update('camguard-dev-insecure-clip-key').digest()
}

export interface Sealed {
  iv: string
  cipher: string // base64( ciphertext || 16-byte GCM tag )
}

export function sealJSON(value: unknown): Sealed {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', clipKey(), iv)
  const pt = Buffer.from(JSON.stringify(value), 'utf8')
  const ct = Buffer.concat([cipher.update(pt), cipher.final()])
  const tag = cipher.getAuthTag()
  return {
    iv: iv.toString('base64'),
    cipher: Buffer.concat([ct, tag]).toString('base64'),
  }
}

export function openJSON<T = unknown>(sealed: Sealed): T {
  const iv = Buffer.from(sealed.iv, 'base64')
  const blob = Buffer.from(sealed.cipher, 'base64')
  const tag = blob.subarray(blob.length - 16)
  const ct = blob.subarray(0, blob.length - 16)
  const decipher = crypto.createDecipheriv('aes-256-gcm', clipKey(), iv)
  decipher.setAuthTag(tag)
  const pt = Buffer.concat([decipher.update(ct), decipher.final()])
  return JSON.parse(pt.toString('utf8')) as T
}
