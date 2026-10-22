'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthedFetch } from '../components/useAuthedFetch'
import { ApprovalBadge, statusBadge } from '../components/ApprovalBadge'
import { useAppContext } from '../components/AppContext'
import type { BoardVote, QuorumState, ViewRequest } from '@/lib/types'

interface EnrichedRequest extends ViewRequest {
  quorum?: QuorumState
}

const BOARD_SEATS = [
  {
    username: 'elena.rostova',
    displayName: 'Elena Rostova',
    seatLabel: 'Seat 1/3 · Building Board Chair',
  },
  {
    username: 'david.chen',
    displayName: 'David Chen',
    seatLabel: 'Seat 2/3 · Resident Representative',
  },
  {
    username: 'reserve.board',
    displayName: 'Sophia Nguyen',
    seatLabel: 'Seat 3/3 · Property Developer Rep',
    isReserve: true,
  },
]

export default function BoardPage() {
  const authedFetch = useAuthedFetch()
  const { persona, setPersonaByUsername, showToast } = useAppContext()
  const [requests, setRequests] = useState<EnrichedRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [votingKey, setVotingKey] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    try {
      const r = await authedFetch('/api/requests?refresh=1')
      if (r.ok) {
        const data = await r.json()
        setRequests(data.requests ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 6000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function castBoardVote(
    requestId: string,
    decision: 'APPROVE' | 'DENY',
    seat: { username: string; displayName: string; seatLabel: string }
  ) {
    const key = `${requestId}-${seat.username}-${decision}`
    setVotingKey(key)
    try {
      const r = await authedFetch('/api/requests', {
        method: 'PATCH',
        body: JSON.stringify({
          requestId,
          decision,
          signerUsername: seat.username,
        }),
      })
      const data = await r.json()
      if (r.ok) {
        showToast({
          title:
            decision === 'DENY'
              ? `Vetoed by ${seat.displayName}`
              : data.request?.status === 'APPROVED'
                ? `🎉 2/2 Quorum Reached! Video Unlocked`
                : `✍️ Signed (1/2) by ${seat.displayName}`,
          subtitle:
            data.request?.status === 'APPROVED'
              ? 'Threshold reached! Click "Watch Decrypted Video Clip Now" to view the unsealed frames.'
              : '1 of 2 required Board signatures recorded. One more signature needed to unlock.',
          tone: decision === 'DENY' ? 'crimson' : 'emerald',
        })
        await refresh()
      } else {
        showToast({
          title: data.error ?? 'Vote Error',
          subtitle: data.detail ?? 'Could not record board signature.',
          tone: 'crimson',
        })
      }
    } finally {
      setVotingKey(null)
    }
  }

  const deepLink = `http://localhost:8080/admin/master/console/#/nextjs-test`

  return (
    <div>
      {/* Poster Section Header */}
      <div className="section-banner">
        <div>
          <span className="eyebrow">
            <span className="code-tag">N4 // STEP 04</span> MULTI-PARTY CRYPTOGRAPHIC GOVERNANCE (2-OF-3 THRESHOLD)
          </span>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            BUILDING BOARD QUORUM CONSOLE
          </h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            No single person — not even the Board Chair or the IT Administrator — can unlock a camera recording alone. A
            minimum of <strong>2 out of 3 elected Building Board representatives</strong> must cryptographically
            co-sign a change request before the <code>cctv-viewer</code> decryption capability commits.
          </p>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={refresh} disabled={loading}>
            {loading ? 'Syncing Quorum…' : '↻ Sync Quorum State'}
          </button>
          <a className="btn" href={deepLink} target="_blank" rel="noreferrer">
            ↗ TideCloak Admin Console (:8080)
          </a>
        </div>
      </div>

      {/* Interactive Quorum Explainer */}
      <div className="explain-box emerald" style={{ marginBottom: 22 }}>
        <div className="explain-box-title">
          <span>💡 How to Demo the 2-of-3 Quorum Unlock in Seconds</span>
          <span className="code-tag">INTERACTIVE ENCLAVE SIGNING</span>
        </div>
        <p>
          For each pending request below, click <strong>1. Co-Sign as Elena (Seat 1/3)</strong> — notice the status
          moves to <code>1/2 Board Signatures</code> and the video player <strong>still refuses to decrypt</strong>.
          Then click <strong>2. Co-Sign as David (Seat 2/3)</strong> to reach the <code>2/2</code> threshold and watch
          the <strong>▶ Watch Decrypted Video Clip Now</strong> button light up in green!
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 36 }}>
          <h3 style={{ marginBottom: 8 }}>No Governance Change Requests in Queue</h3>
          <p className="muted" style={{ marginBottom: 16 }}>
            File a resident request in Step 02 or simulate a Rogue IT Admin self-grant in Step 03 first.
          </p>
          <div className="btn-row" style={{ justifyContent: 'center' }}>
            <Link href="/request" className="btn primary">
              📜 File a Resident Request
            </Link>
            <Link href="/ingest" className="btn">
              🚨 Simulate Rogue IT Admin
            </Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {requests.map((r) => {
            const votes: BoardVote[] = r.votes ?? []
            const approvals = votes.filter((v) => v.decision === 'APPROVE')
            const count = Math.max(r.quorum?.authorizationCount ?? 0, approvals.length)
            const threshold = r.quorum?.threshold ?? 2
            const unlocked = r.status === 'APPROVED' || r.status === 'VIEWED' || r.quorum?.committed
            const denied = r.status === 'DENIED'

            return (
              <div
                key={r.id}
                className="card"
                style={{
                  marginBottom: 0,
                  borderLeft: r.isRogueAdminAttempt
                    ? '5px solid var(--accent)'
                    : unlocked
                      ? '5px solid var(--emerald)'
                      : '5px solid var(--amber)',
                }}
              >
                {/* Rogue Admin Warning Banner */}
                {r.isRogueAdminAttempt && (
                  <div className="explain-box crimson" style={{ marginTop: 0, marginBottom: 14 }}>
                    <div className="explain-box-title">
                      <span>🚨 SECURITY ALERT: PRIVILEGED IT ADMIN SELF-GRANT INTERCEPTED</span>
                      <span className="code-tag">IGA QUORUM TRAP</span>
                    </div>
                    <p>
                      IT Systems Engineer <strong>{r.requesterDisplayName || r.requester}</strong> attempted to
                      self-assign the <code>cctv-viewer</code> decryption role via the backend API. TideCloak IGA froze
                      the privilege escalation at <code>0/2 Board Signatures</code>. Click{' '}
                      <strong>✕ Veto</strong> below to permanently reject this unauthorized attempt.
                    </p>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                    flexWrap: 'wrap',
                    marginBottom: 14,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span className="code-tag">CR #{(r.crId ?? r.id).slice(0, 12)}</span>
                      <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {r.camera} — {r.zone || r.clipId}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                      <strong>Target Clip:</strong> <code>{r.clipId}</code> · <strong>Applicant:</strong>{' '}
                      {r.requesterDisplayName || r.requester} ({r.requesterRole || 'Resident'}) ·{' '}
                      <strong>Filed:</strong> {new Date(r.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <ApprovalBadge status={r.status} quorum={r.quorum} />
                    {statusBadge(r.status, r.isRogueAdminAttempt)}
                  </div>
                </div>

                {/* Public Justification Quote */}
                <div
                  style={{
                    padding: '12px 14px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius)',
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'var(--mono)',
                      fontSize: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--text-muted)',
                      marginBottom: 4,
                    }}
                  >
                    Publicly Declared Justification on Community Ledger:
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>
                    &ldquo;{r.reason}&rdquo;
                  </div>
                </div>

                {/* 3-Seat Quorum Progress Grid */}
                <div className="grid-3" style={{ marginBottom: 16 }}>
                  {BOARD_SEATS.map((seat) => {
                    const existingVote = votes.find((v) => v.username === seat.username)
                    const isCurrentPersona = persona.username === seat.username
                    const btnKey = `${r.id}-${seat.username}-APPROVE`

                    return (
                      <div
                        key={seat.username}
                        style={{
                          padding: 12,
                          borderRadius: 'var(--radius)',
                          border: existingVote
                            ? existingVote.decision === 'APPROVE'
                              ? '1.5px solid var(--emerald)'
                              : '1.5px solid var(--accent)'
                            : '1px dashed var(--border-strong)',
                          background: existingVote
                            ? existingVote.decision === 'APPROVE'
                              ? 'var(--emerald-soft)'
                              : 'var(--accent-soft)'
                            : 'var(--bg-surface)',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 6,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'var(--mono)',
                              fontSize: 10,
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {seat.seatLabel}
                          </span>
                          {isCurrentPersona && <span className="code-tag">ACTIVE</span>}
                        </div>

                        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>{seat.displayName}</div>

                        {existingVote ? (
                          <div style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>
                            {existingVote.decision === 'APPROVE' ? (
                              <span style={{ color: 'var(--emerald)', fontWeight: 700 }}>
                                ✓ CO-SIGNED ({new Date(existingVote.timestamp).toLocaleTimeString()})
                                <br />
                                <span style={{ fontSize: 10, opacity: 0.8 }}>Sig: {existingVote.signatureHash}</span>
                              </span>
                            ) : (
                              <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                                ✕ VETOED ({new Date(existingVote.timestamp).toLocaleTimeString()})
                              </span>
                            )}
                          </div>
                        ) : seat.isReserve ? (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            Reserve Quorum Seat (Only 2 of 3 signatures required to reach threshold)
                          </span>
                        ) : !unlocked && !denied ? (
                          <div className="btn-row">
                            <button
                              type="button"
                              className="btn sm emerald"
                              disabled={votingKey !== null}
                              onClick={() => castBoardVote(r.id, 'APPROVE', seat)}
                            >
                              {votingKey === btnKey ? 'Signing…' : `✍ Co-Sign as ${seat.displayName.split(' ')[0]}`}
                            </button>
                            <button
                              type="button"
                              className="btn sm danger"
                              disabled={votingKey !== null}
                              onClick={() => castBoardVote(r.id, 'DENY', seat)}
                              title="Veto and reject this request"
                            >
                              ✕ Veto
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {unlocked ? 'Quorum already satisfied (2/3)' : 'Request closed'}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Bottom Action Bar */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                    paddingTop: 12,
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    <strong>Status Summary:</strong>{' '}
                    {unlocked
                      ? `2/2 Board Threshold committed! ${
                          r.requesterDisplayName || r.requester
                        } is now authorized to decrypt clip ${r.clipId}.`
                      : denied
                        ? 'This change request was vetoed by the Building Board. The video remains sealed.'
                        : `${count} of ${threshold} required Board signatures collected. ${
                            threshold - count
                          } more co-signature needed to release decryption key.`}
                  </div>

                  <div className="btn-row">
                    {!persona.isBoardMember && !unlocked && (
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => setPersonaByUsername('elena.rostova')}
                      >
                        🎭 Switch Identity to Elena (Board Chair)
                      </button>
                    )}
                    <Link
                      href={`/viewer/${r.clipId}`}
                      className={`btn ${unlocked ? 'emerald' : 'sm'}`}
                    >
                      {unlocked
                        ? '▶ Watch Decrypted Video Clip Now →'
                        : `🔒 Test Player (${count}/${threshold} Locked)`}
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
