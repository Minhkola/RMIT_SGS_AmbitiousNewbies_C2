'use client'

import { useEffect, useState } from 'react'
import { useAuthedFetch } from '../components/useAuthedFetch'
import type { AuditEntry } from '@/lib/types'

const ACTION_STYLE: Record<
  AuditEntry['action'],
  { label: string; cls: string; icon: string }
> = {
  AI_ANSWERED: {
    label: 'AI Sensor Query',
    cls: 'info',
    icon: '🤖',
  },
  AI_DENIED: {
    label: 'AI Prompt Injection Blocked',
    cls: 'denied',
    icon: '🛡️',
  },
  REQUESTED: {
    label: 'Public Video Petition Filed',
    cls: 'pending',
    icon: '📜',
  },
  ADMIN_BLOCKED: {
    label: 'Rogue IT Admin Self-Grant Blocked',
    cls: 'denied',
    icon: '🚨',
  },
  BOARD_SIGNED: {
    label: 'Board Enclave Signature',
    cls: 'info',
    icon: '✍️',
  },
  APPROVED: {
    label: '2/3 Quorum Threshold Reached',
    cls: 'approved',
    icon: '✅',
  },
  VIEWED: {
    label: 'Video Clip Decrypted & Viewed',
    cls: 'viewed',
    icon: '👁️',
  },
  DENIED: {
    label: 'Unauthorized Decrypt / Vetoed (403)',
    cls: 'denied',
    icon: '🔒',
  },
  INGESTED: {
    label: 'Camera Edge Clip Sealed',
    cls: 'info',
    icon: '📹',
  },
}

export default function AuditPage() {
  const authedFetch = useAuthedFetch()
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [filter, setFilter] = useState<string>('ALL')
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await authedFetch('/api/audit')
      if (r.ok) {
        const data = await r.json()
        setEntries(data.audit ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = entries.filter((e) => {
    if (filter === 'ALL') return true
    if (filter === 'BLOCKS') {
      return e.action === 'AI_DENIED' || e.action === 'ADMIN_BLOCKED' || e.action === 'DENIED'
    }
    if (filter === 'QUORUM') {
      return (
        e.action === 'REQUESTED' ||
        e.action === 'BOARD_SIGNED' ||
        e.action === 'APPROVED' ||
        e.action === 'VIEWED'
      )
    }
    return true
  })

  return (
    <div>
      {/* Poster Header */}
      <div className="section-banner">
        <div>
          <span className="eyebrow">
            <span className="code-tag">N5 // PUBLIC TRANSPARENCY LEDGER</span> APPEND-ONLY COMMUNITY AUDIT LOG
          </span>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            PUBLIC COMMUNITY AUDIT LEDGER
          </h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            Every resident in the apartment building can inspect this ledger at any time. Whether an AI prompt injection
            was blocked, an IT administrator tried to self-grant permissions, or the Building Board voted to unlock a
            camera clip — <strong>every action is translated into plain English and permanently recorded</strong>.
          </p>
        </div>
        <div className="btn-row">
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : '↻ Refresh Ledger'}
          </button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="chip-row" style={{ marginBottom: 18 }}>
        <button
          type="button"
          className="chip"
          style={{
            borderColor: filter === 'ALL' ? 'var(--text-primary)' : undefined,
            fontWeight: filter === 'ALL' ? 700 : 500,
          }}
          onClick={() => setFilter('ALL')}
        >
          All Recorded Events ({entries.length})
        </button>
        <button
          type="button"
          className="chip danger"
          style={{
            fontWeight: filter === 'BLOCKS' ? 700 : 500,
          }}
          onClick={() => setFilter('BLOCKS')}
        >
          🛡 Blocked Attacks &amp; Unauthorized Attempts
        </button>
        <button
          type="button"
          className="chip"
          style={{
            borderColor: filter === 'QUORUM' ? 'var(--emerald)' : undefined,
            fontWeight: filter === 'QUORUM' ? 700 : 500,
          }}
          onClick={() => setFilter('QUORUM')}
        >
          🗳 Quorum Petitions, Votes &amp; Unlocks
        </button>
      </div>

      {/* Audit Entries List */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Chronological Governance &amp; Security Log ({filtered.length})</div>
            <div className="card-sub">
              Each entry includes both a plain-English explanation for residents and the technical verification record
            </div>
          </div>
          <span className="code-tag">IMMUTABLE LOG</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((a) => {
            const meta = ACTION_STYLE[a.action] ?? {
              label: a.action,
              cls: 'info',
              icon: '•',
            }
            return (
              <div
                key={a.id}
                style={{
                  padding: 14,
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border-subtle)',
                  borderLeft:
                    meta.cls === 'denied'
                      ? '4px solid var(--accent)'
                      : meta.cls === 'approved' || meta.cls === 'viewed'
                        ? '4px solid var(--emerald)'
                        : '4px solid var(--border-strong)',
                  background: 'var(--bg-elevated)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className={`badge ${meta.cls}`}>
                      {meta.icon} {meta.label}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{a.actor}</span>
                    {a.actorRole && <span className="code-tag">{a.actorRole}</span>}
                    {a.crId && (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                        CR: <code>{a.crId.slice(0, 12)}</code>
                      </span>
                    )}
                  </div>

                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(a.ts).toLocaleString()}
                  </span>
                </div>

                {/* Human-friendly explanation */}
                {a.humanExplanation && (
                  <p
                    style={{
                      fontSize: 13.5,
                      color: 'var(--text-primary)',
                      margin: '0 0 6px',
                      lineHeight: 1.5,
                    }}
                  >
                    {a.humanExplanation}
                  </p>
                )}

                {/* Technical detail */}
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 11.5,
                    color: 'var(--text-muted)',
                  }}
                >
                  Tech Log: {a.detail}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
