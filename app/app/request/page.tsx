'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuthedFetch } from '../components/useAuthedFetch'
import { ApprovalBadge, statusBadge } from '../components/ApprovalBadge'
import { useAppContext } from '../components/AppContext'
import type { ClipMeta, QuorumState, ViewRequest } from '@/lib/types'

interface EnrichedRequest extends ViewRequest {
  quorum?: QuorumState
}

const PRESET_REASONS: Array<{ label: string; clipId: string; reason: string }> = [
  {
    label: '🚲 Missing Bicycle — Floor 12 (21:43)',
    clipId: 'clip-L12-2143',
    reason:
      'Resident in Apt 1205 reported a missing commuter bicycle outside the North Corridor stairwell between 21:40 and 21:50. Requesting 2/3 Board Quorum to review CAM-L12-HALL footage.',
  },
  {
    label: '📦 Smart Locker Parcel Dispute — Parcel Room (17:05)',
    clipId: 'clip-PARCEL-1705',
    reason:
      'Courier delivery #VN-8841 marked dropped into Smart Locker #4 at 17:05, but resident could not locate the package. Requesting Board review of CAM-PARCEL clip.',
  },
  {
    label: '🚗 Evening Gate Bumper Scrape — Basement B1 (21:43)',
    clipId: 'clip-B1GATE-2143',
    reason:
      'Parking bay B1-14 resident reported a minor bumper scrape near the entry barrier between 21:40 and 21:50. Requesting quorum unlock for insurance verification.',
  },
]

function RequestInner() {
  const authedFetch = useAuthedFetch()
  const { persona, showToast } = useAppContext()
  const params = useSearchParams()
  const preselect = params.get('clip') ?? ''

  const [clips, setClips] = useState<ClipMeta[]>([])
  const [requests, setRequests] = useState<EnrichedRequest[]>([])
  const [clipId, setClipId] = useState(preselect)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string; clipId?: string } | null>(null)

  async function load() {
    const [reqRes, clipRes] = await Promise.all([
      authedFetch('/api/requests'),
      authedFetch('/api/clips'),
    ])
    if (clipRes.ok) {
      const cData = await clipRes.json()
      const list: ClipMeta[] = cData.clips ?? []
      setClips(list)
      if (!clipId && (preselect || list[0]?.clipId)) {
        setClipId(preselect || list[0].clipId)
      }
    }
    if (reqRes.ok) {
      const rData = await reqRes.json()
      setRequests(rData.requests ?? [])
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona.username])

  function applyPreset(preset: { clipId: string; reason: string }) {
    setClipId(preset.clipId)
    setReason(preset.reason)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!clipId || reason.trim().length < 5) return
    setBusy(true)
    setMsg(null)
    try {
      const r = await authedFetch('/api/requests', {
        method: 'POST',
        body: JSON.stringify({ clipId, reason, source: 'ui' }),
      })
      const data = await r.json()
      if (!r.ok) {
        setMsg({ kind: 'err', text: data.error ?? `Request failed (${r.status})` })
      } else {
        setReason('')
        setMsg({
          kind: 'ok',
          text: `Public review request filed (#${data.request.id}). Your request is now locked at 0/2 Board Signatures until 2 of 3 Building Board members co-sign.`,
          clipId,
        })
        showToast({
          title: 'Public Video Request Filed',
          subtitle: 'Locked at 0/2 Board Signatures. Head to Step 04 (Board Quorum) to co-sign!',
          tone: 'emerald',
        })
        await load()
      }
    } catch (err) {
      setMsg({ kind: 'err', text: (err as Error).message })
    } finally {
      setBusy(false)
    }
  }

  const selectedClip = clips.find((c) => c.clipId === clipId)

  return (
    <div>
      {/* Poster Section Header */}
      <div className="section-banner">
        <div>
          <span className="eyebrow">
            <span className="code-tag">N2 // STEP 02</span> PUBLIC INCIDENT DISCLOSURE &amp; QUORUM PETITION
          </span>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            FILE A VIDEO ACCESS REQUEST
          </h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            In a traditional apartment building, residents ask a guard or technician to &ldquo;check the cameras
            privately.&rdquo; In <strong>CamGuard</strong>, every request to view an encrypted clip requires a{' '}
            <strong>public written justification</strong> and stays mathematically locked until{' '}
            <strong>2 of 3 Building Board representatives</strong> co-sign your request.
          </p>
        </div>
        <div className="human-pill">
          Filing as: <strong>{persona.displayName}</strong> ({persona.badge})
        </div>
      </div>

      {/* Humanized 3-Pillar Explanation */}
      <div className="grid-3" style={{ marginBottom: 22 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <span className="card-title">1. Public Justification</span>
            <span className="badge info">No Secret Favours</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Your name, apartment role, target camera, and stated reason are permanently written to the{' '}
            <Link href="/audit" style={{ color: 'var(--accent)', fontWeight: 600 }}>
              Community Transparency Ledger
            </Link>{' '}
            before anyone can vote.
          </p>
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <span className="card-title">2. 2-of-3 Board Threshold</span>
            <span className="badge pending">Quorum Gate</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Filing a request creates an uncommitted TideCloak Change Request for the <code>cctv-viewer</code> role. At{' '}
            <code>0/2</code> or <code>1/2</code> votes, the video remains encrypted ciphertext.
          </p>
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <span className="card-title">3. Scoped Clip Decryption</span>
            <span className="badge approved">Privacy Preserved</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Once 2 Board members co-sign, only the specific incident clip is unlocked for inspection, and the unlock
            event itself is logged for all residents to see.
          </p>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Left: Request Form */}
        <form className="card" onSubmit={submit} style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Submit Formal Clip Unseal Petition</div>
              <div className="card-sub">
                Choose a camera segment or click a 1-click preset incident below to test the workflow
              </div>
            </div>
            <span className="code-tag">CAPTURE-THEN-VETO</span>
          </div>

          {/* 1-Click Quick Fill Scenarios */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                marginBottom: 8,
              }}
            >
              ⚡ Quick-Fill Demo Scenarios (1-Click):
            </div>
            <div className="chip-row">
              {PRESET_REASONS.map((p) => (
                <button
                  key={p.clipId}
                  type="button"
                  className="chip"
                  onClick={() => applyPreset(p)}
                  style={{
                    borderColor: clipId === p.clipId && reason === p.reason ? 'var(--accent)' : undefined,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>1. Select Encrypted Camera Recording</label>
            <select value={clipId} onChange={(e) => setClipId(e.target.value)} required>
              {clips.map((c) => (
                <option key={c.clipId} value={c.clipId}>
                  [{c.camera}] {c.zone} — {c.label} ({c.frames} frames)
                </option>
              ))}
            </select>
          </div>

          {selectedClip && (
            <div className="explain-box" style={{ marginTop: 0, marginBottom: 16 }}>
              <div className="explain-box-title">
                <span>🔒 Target Vault Record: {selectedClip.clipId}</span>
                <span className="code-tag">AES-GCM-256</span>
              </div>
              <p>
                <strong>Zone:</strong> {selectedClip.zone} ({selectedClip.camera}) · <strong>Window:</strong>{' '}
                {new Date(selectedClip.from).toLocaleTimeString()} – {new Date(selectedClip.to).toLocaleTimeString()}
                <br />
                <strong>AI Sensor Metadata Summary:</strong> {selectedClip.humanSummary || selectedClip.label}
              </p>
            </div>
          )}

          <div className="field">
            <label>2. Public Reason for Requesting Decryption (Visible to Entire Building)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the incident clearly (e.g., Missing bicycle outside Apt 1205 between 21:40 and 21:50)..."
              required
              minLength={5}
            />
          </div>

          <div className="btn-row" style={{ justifyContent: 'space-between', marginTop: 14 }}>
            <span className="muted" style={{ fontSize: 12 }}>
              Applicant: <strong>{persona.displayName}</strong> (<code>{persona.username}</code>)
            </span>
            <button className="btn primary" type="submit" disabled={busy || reason.trim().length < 5}>
              {busy ? 'Creating TideCloak Change Request…' : '📜 File Public Request & Notify Board'}
            </button>
          </div>

          {msg && (
            <div
              className={`explain-box ${msg.kind === 'err' ? 'crimson' : 'emerald'}`}
              style={{ marginTop: 16 }}
            >
              <div className="explain-box-title">
                {msg.kind === 'ok' ? '✓ Request Logged & Sent to Quorum Queue' : '✕ Could Not File Request'}
              </div>
              <p>{msg.text}</p>
              {msg.kind === 'ok' && (
                <div className="btn-row" style={{ marginTop: 10 }}>
                  <Link href="/board" className="btn primary sm">
                    🗳 Go to Step 04: Board Quorum (Co-Sign 2/3) →
                  </Link>
                  {msg.clipId && (
                    <Link href={`/viewer/${msg.clipId}`} className="btn sm">
                      🔒 Test Opening Player Right Now (Verify 0/2 Block)
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </form>

        {/* Right: Live Status of All Filed Requests */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Active &amp; Historical Clip Requests ({requests.length})</div>
              <div className="card-sub">
                Watch the live signature count update from <code>0/2</code> to <code>2/2</code> as Board members vote
              </div>
            </div>
            <button className="btn sm" onClick={load}>
              ↻ Refresh
            </button>
          </div>

          {requests.length === 0 ? (
            <p className="muted" style={{ padding: '20px 0', textAlign: 'center' }}>
              No clip requests filed yet. Pick a preset scenario on the left and submit!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {requests.map((r) => {
                const unlocked = r.status === 'APPROVED' || r.status === 'VIEWED' || r.quorum?.committed
                return (
                  <div
                    key={r.id}
                    style={{
                      border: '1px solid var(--border-subtle)',
                      borderLeft: r.isRogueAdminAttempt
                        ? '4px solid var(--accent)'
                        : unlocked
                          ? '4px solid var(--emerald)'
                          : '4px solid var(--amber)',
                      borderRadius: 'var(--radius)',
                      padding: 14,
                      background: 'var(--bg-elevated)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 8,
                        flexWrap: 'wrap',
                        marginBottom: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                          {r.camera} · {r.zone || r.clipId}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                          Clip <code>{r.clipId}</code> · Filed by{' '}
                          <strong>{r.requesterDisplayName || r.requester}</strong> ({r.requesterRole || 'Resident'}) ·{' '}
                          {new Date(r.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <ApprovalBadge status={r.status} quorum={r.quorum} />
                        {statusBadge(r.status, r.isRogueAdminAttempt)}
                      </div>
                    </div>

                    <p
                      style={{
                        fontSize: 13,
                        color: 'var(--text-secondary)',
                        margin: '0 0 10px',
                        padding: '8px 10px',
                        background: 'var(--bg-surface)',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      &ldquo;{r.reason}&rdquo;
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {unlocked
                          ? '2/2 Quorum achieved — ready for browser decryption.'
                          : 'Locked until 2 of 3 Building Board members co-sign.'}
                      </span>
                      <div className="btn-row">
                        {!unlocked && r.status === 'PENDING_QUORUM' && (
                          <Link href="/board" className="btn sm">
                            🗳 Co-Sign on Board Page →
                          </Link>
                        )}
                        <Link
                          href={`/viewer/${r.clipId}`}
                          className={`btn sm ${unlocked ? 'emerald' : ''}`}
                        >
                          {unlocked ? '▶ Watch Decrypted Video' : '🔒 Test Locked Player'}
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RequestPage() {
  return (
    <Suspense fallback={<div className="card">Loading request portal…</div>}>
      <RequestInner />
    </Suspense>
  )
}
