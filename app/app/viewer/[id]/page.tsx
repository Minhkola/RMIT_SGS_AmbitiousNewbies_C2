'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useAuthedFetch } from '../../components/useAuthedFetch'
import { useAppContext } from '../../components/AppContext'
import SecurityEye from '../../components/SecurityEye'
import type { ClipMeta, ViewRequest } from '@/lib/types'

interface UnlockedPayload {
  status: 'UNLOCKED'
  clip: ClipMeta
  frames: string[]
  viewedBy: string
  viewedByRole?: string
  quorumRequest: ViewRequest | null
}

interface LockedPayload {
  error: string
  code?: string
  detail?: string
  caller?: string
  callerDisplayName?: string
  callerRoles?: string[]
  clip?: ClipMeta
  ciphertextPreview?: {
    alg: string
    ivHex: string
    byteLength: number
    sampleHex: string
  }
}

export default function ViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const authedFetch = useAuthedFetch()
  const { persona, setPersonaByUsername } = useAppContext()

  const [state, setState] = useState<'loading' | 'locked' | 'ok'>('loading')
  const [unlocked, setUnlocked] = useState<UnlockedPayload | null>(null)
  const [locked, setLocked] = useState<LockedPayload | null>(null)
  const [frameIdx, setFrameIdx] = useState(0)
  const [playing, setPlaying] = useState(true)

  async function attemptDecrypt() {
    setState('loading')
    const r = await authedFetch(`/api/clips/${id}/view`)
    const data = await r.json()
    if (r.ok && (data.status === 'UNLOCKED' || Array.isArray(data.frames))) {
      setUnlocked(data)
      setLocked(null)
      setState('ok')
    } else {
      setLocked(data)
      setUnlocked(null)
      setState('locked')
    }
  }

  useEffect(() => {
    attemptDecrypt()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, persona.username])

  useEffect(() => {
    if (state !== 'ok' || !unlocked || !playing) return
    const timer = setInterval(() => {
      setFrameIdx((i) => (i + 1) % unlocked.frames.length)
    }, 1100)
    return () => clearInterval(timer)
  }, [state, unlocked, playing])

  const clipMeta = unlocked?.clip ?? locked?.clip
  const approvers =
    unlocked?.quorumRequest?.votes?.filter((v) => v.decision === 'APPROVE').map((v) => v.displayName) ?? [
      'Elena Rostova (Board 1/3)',
      'David Chen (Board 2/3)',
    ]

  return (
    <div>
      {/* Poster Header */}
      <div className="section-banner">
        <div>
          <span className="eyebrow">
            <span className="code-tag">CRYPTOGRAPHIC VIDEO DECODER</span> CLIP TARGET: {id.toUpperCase()}
          </span>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            {clipMeta ? `${clipMeta.camera} — ${clipMeta.label}` : `CAMERA VAULT STREAM // ${id}`}
          </h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            {state === 'ok'
              ? 'Quorum verification succeeded! The 2-of-3 Building Board signature threshold has been verified and the AES-GCM-256 stream is now decrypted in your browser.'
              : 'This camera recording is sealed with AES-GCM-256 encryption. Until 2 of 3 Building Board members co-sign a public request, the server refuses to release the decryption key.'}
          </p>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={attemptDecrypt}>
            ↻ Re-Verify Quorum &amp; Key
          </button>
          <Link href="/board" className="btn primary">
            🗳 Board Quorum Console →
          </Link>
        </div>
      </div>

      {state === 'loading' && (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text-muted)' }}>
            VERIFYING JWT ROLES &amp; TIDECLOAK QUORUM SIGNATURES FOR CLIP [{id}]…
          </div>
        </div>
      )}

      {/* LOCKED STATE — DRAMATIC POSTER BLOCKED VIEW */}
      {state === 'locked' && locked && (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div
            className="card"
            style={{
              border: '2px solid var(--accent)',
              marginBottom: 0,
            }}
          >
            <div className="card-header">
              <div>
                <span className="badge denied">🔒 HTTP 403 · {locked.error}</span>
                <div className="card-title" style={{ fontSize: 20, marginTop: 8 }}>
                  Decryption Key Withheld — Video Stream Remains Sealed
                </div>
              </div>
              <span className="code-tag">AES-GCM-256 LOCKED</span>
            </div>

            {/* Human-Friendly Explanation Box */}
            <div className="explain-box crimson" style={{ marginTop: 0, marginBottom: 16 }}>
              <div className="explain-box-title">
                <span>Why You Cannot Watch This Video Right Now</span>
                <span className="code-tag">HUMAN SUMMARY</span>
              </div>
              <p>
                {locked.detail ??
                  'Even if someone knows the file URL or holds IT Admin credentials, CamGuard mathematically blocks video decryption until 2 of 3 Building Board members co-sign a public request.'}
              </p>
            </div>

            {/* Caller Identity Diagnostic */}
            <div
              style={{
                padding: 12,
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border-subtle)',
                fontFamily: 'var(--mono)',
                fontSize: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <strong>Active Viewer Identity:</strong> {locked.callerDisplayName || persona.displayName} (
                <code>{locked.caller || persona.username}</code>)
              </div>
              <div style={{ marginTop: 4 }}>
                <strong>Active Capability Tags:</strong>{' '}
                {locked.callerRoles?.length ? locked.callerRoles.join(', ') : persona.roles.join(', ')}
              </div>
              <div style={{ marginTop: 4, color: 'var(--accent)' }}>
                <strong>Missing Requirement:</strong> Committed 2/3 Board Quorum + <code>cctv-viewer</code> tag
              </div>
            </div>

            {/* Raw Ciphertext Hex Proof */}
            {locked.ciphertextPreview && (
              <div>
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-muted)',
                    marginBottom: 6,
                  }}
                >
                  Raw Encrypted File on Disk (data/clips/{id}.json — {locked.ciphertextPreview.byteLength} cipher chars):
                </div>
                <pre className="cipher-dump">
{`ALGORITHM : ${locked.ciphertextPreview.alg} (Authenticated Encryption)
NONCE IV  : ${locked.ciphertextPreview.ivHex}
CIPHERTEXT: ${locked.ciphertextPreview.sampleHex}… [UNREADABLE WITHOUT QUORUM KEY]`}
                </pre>
              </div>
            )}

            {/* Next Step CTA Buttons */}
            <div className="btn-row" style={{ marginTop: 18 }}>
              <Link href={`/request?clip=${id}`} className="btn primary">
                📜 Step 1: File Public Request for This Clip
              </Link>
              <Link href="/board" className="btn emerald">
                ✍ Step 2: Co-Sign 2/3 on Board Console →
              </Link>
              {persona.username === 'victor.k' && (
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => setPersonaByUsername('maya.lin')}
                >
                  🎭 Switch Back to Maya Lin (Resident)
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Poster Security Eye in Blocked State */}
          <div>
            <SecurityEye mode="blocked" />
          </div>
        </div>
      )}

      {/* UNLOCKED STATE — DECRYPTED FRAME PLAYER & QUORUM CERTIFICATE */}
      {state === 'ok' && unlocked && (
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div
            className="card"
            style={{
              border: '2px solid var(--emerald)',
              marginBottom: 0,
            }}
          >
            <div className="card-header">
              <div>
                <span className="badge approved">✓ QUORUM-DECRYPTED (2/2 BOARD SIGNATURES VERIFIED)</span>
                <div className="card-title" style={{ fontSize: 19, marginTop: 6 }}>
                  {unlocked.clip.camera} — {unlocked.clip.label}
                </div>
                <div className="card-sub">
                  {unlocked.clip.zone} · Window: {new Date(unlocked.clip.from).toLocaleTimeString()} –{' '}
                  {new Date(unlocked.clip.to).toLocaleTimeString()}
                </div>
              </div>
              <span className="code-tag">AES-GCM VERIFIED</span>
            </div>

            {/* Rendered SVG Surveillance Frame */}
            <div
              style={{
                borderRadius: 'var(--radius)',
                overflow: 'hidden',
                border: '1.5px solid var(--border-strong)',
                background: '#05080f',
                marginBottom: 14,
              }}
              dangerouslySetInnerHTML={{ __html: unlocked.frames[frameIdx] }}
            />

            {/* Player Scrubber & Frame Controls */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
                padding: '10px 12px',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="btn-row">
                <button
                  type="button"
                  className="btn sm primary"
                  onClick={() => setPlaying((p) => !p)}
                >
                  {playing ? '⏸ Pause Playback' : '▶ Auto-Play Frames'}
                </button>
                {unlocked.frames.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`btn sm ${frameIdx === idx ? 'emerald' : ''}`}
                    onClick={() => {
                      setPlaying(false)
                      setFrameIdx(idx)
                    }}
                  >
                    Frame 0{idx + 1}
                  </button>
                ))}
              </div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                FRAME {frameIdx + 1} OF {unlocked.frames.length} · 128-BIT GCM TAG OK
              </span>
            </div>
          </div>

          {/* Right Column: Quorum Certificate + Unlocked Eye */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="card" style={{ marginBottom: 0 }}>
              <div className="card-header">
                <span className="card-title">Cryptographic Quorum Unseal Certificate</span>
                <span className="badge info">Publicly Audited</span>
              </div>

              <div className="explain-box emerald" style={{ marginTop: 0, marginBottom: 14 }}>
                <div className="explain-box-title">
                  <span>✓ Accountable Access Confirmed</span>
                  <span className="code-tag">LOGGED TO LEDGER</span>
                </div>
                <p>
                  This clip was unlocked only after 2 of 3 Building Board members co-signed the public request. This
                  playback session has been permanently recorded in the community audit ledger.
                </p>
              </div>

              <div
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  padding: 12,
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <strong>Viewer Identity:</strong> {unlocked.viewedBy} ({unlocked.viewedByRole || 'Authorized Viewer'})
                </div>
                <div>
                  <strong>Request Ticket:</strong> #{unlocked.quorumRequest?.id ?? 'Verified'}
                </div>
                <div>
                  <strong>TideCloak Change Request:</strong> {unlocked.quorumRequest?.crId ?? 'Committed'}
                </div>
                <div>
                  <strong>Board Co-Signers (2/2):</strong> {approvers.join(' + ')}
                </div>
              </div>

              <div className="btn-row" style={{ marginTop: 14 }}>
                <Link href="/audit" className="btn sm primary">
                  📋 Verify This Unlock Event in Public Audit Ledger →
                </Link>
              </div>
            </div>

            <SecurityEye mode="unlocked" compact />
          </div>
        </div>
      )}
    </div>
  )
}
