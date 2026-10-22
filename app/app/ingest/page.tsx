'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthedFetch } from '../components/useAuthedFetch'
import { useAppContext } from '../components/AppContext'
import type { ClipMeta } from '@/lib/types'

export default function IngestPage() {
  const authedFetch = useAuthedFetch()
  const { persona, setPersonaByUsername, showToast } = useAppContext()
  const [clips, setClips] = useState<ClipMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [rogueClipId, setRogueClipId] = useState('clip-L12-2143')
  const [rogueBusy, setRogueBusy] = useState(false)
  const [rogueResult, setRogueResult] = useState<{
    crId: string
    clipId: string
    humanMessage: string
  } | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const r = await authedFetch('/api/clips')
        if (r.ok) {
          const data = await r.json()
          const list: ClipMeta[] = data.clips ?? []
          setClips(list)
          if (list[0]?.clipId && !list.some((c) => c.clipId === rogueClipId)) {
            setRogueClipId(list[0].clipId)
          }
        }
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persona.username])

  async function triggerRogueAdminAttempt() {
    setRogueBusy(true)
    setRogueResult(null)
    if (persona.username !== 'victor.k') {
      setPersonaByUsername('victor.k', true)
    }
    try {
      const r = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CamGuard-Persona': 'victor.k',
        },
        body: JSON.stringify({
          clipId: rogueClipId,
          isRogueAdminAttempt: true,
        }),
      })
      const data = await r.json()
      if (r.ok) {
        setRogueResult({
          crId: data.request?.crId ?? data.request?.id ?? 'cr-rogue',
          clipId: rogueClipId,
          humanMessage:
            'TideCloak Identity Governance (IGA) intercepted the self-grant! Because Quorum Governance is enabled on the realm, even an IT Admin with manage-users cannot activate cctv-viewer without 2 of 3 Building Board signatures.',
        })
        showToast({
          title: '🚨 Rogue Admin Self-Grant Intercepted!',
          subtitle: 'Victor K. is frozen at 0/2 Board Signatures and logged in the public audit ledger.',
          tone: 'crimson',
        })
      }
    } finally {
      setRogueBusy(false)
    }
  }

  return (
    <div>
      {/* Poster Section Header */}
      <div className="section-banner">
        <div>
          <span className="eyebrow">
            <span className="code-tag">N3 // STEP 03</span> ZERO-KNOWLEDGE CAMERA VAULT &amp; INSIDER THREAT TEST
          </span>
          <h1 className="page-title" style={{ marginTop: 8 }}>
            ENCRYPTED VAULT &amp; ROGUE IT ADMIN LAB
          </h1>
          <p className="page-sub" style={{ marginBottom: 0 }}>
            In every normal building, the <strong>IT Administrator</strong> who manages the servers can quietly grant
            themselves full access to any camera feed. Here, you can test what happens when{' '}
            <strong>Victor K. (Lead Systems Engineer)</strong> tries to bypass the rules and grant himself the{' '}
            <code>cctv-viewer</code> decryption role.
          </p>
        </div>
        <div className="human-pill">
          Active Identity: <strong>{persona.displayName}</strong> ({persona.badge})
        </div>
      </div>

      {/* Interactive Rogue Admin Attack Simulator Card */}
      <div
        className="card"
        style={{
          border: '2px solid var(--accent)',
          background: 'var(--bg-surface)',
          marginBottom: 24,
        }}
      >
        <div className="card-header">
          <div>
            <span className="eyebrow" style={{ marginBottom: 4 }}>
              <span className="code-tag">RED-TEAM INSIDER SIMULATION</span> ACT III OF THE 2-MINUTE PITCH
            </span>
            <div className="card-title" style={{ fontSize: 18 }}>
              🚨 Test Scenario: What If the IT Admin Tries to Grant Himself Decryption Access?
            </div>
            <div className="card-sub">
              Victor K. holds the <code>tide-realm-admin (manage-users)</code> privilege. Let&apos;s see what happens
              when he calls the backend API to assign <code>cctv-viewer</code> to his own account.
            </div>
          </div>
          <span className="badge denied">Insider Threat Test</span>
        </div>

        <div className="grid-2" style={{ alignItems: 'center', gap: 16 }}>
          <div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>Target Camera Clip Victor K. Wants to Peek At:</label>
              <select value={rogueClipId} onChange={(e) => setRogueClipId(e.target.value)}>
                {clips.map((c) => (
                  <option key={c.clipId} value={c.clipId}>
                    [{c.camera}] {c.zone} — {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="btn-row">
              <button
                type="button"
                className="btn danger"
                disabled={rogueBusy}
                onClick={triggerRogueAdminAttempt}
              >
                {rogueBusy
                  ? 'Executing Admin Privilege Escalation…'
                  : '⚡ Simulate Rogue IT Admin Self-Grant (cctv-viewer)'}
              </button>
              <Link href={`/viewer/${rogueClipId}`} className="btn">
                🔒 Try Opening Player as IT Admin
              </Link>
            </div>
          </div>

          <div className="explain-box" style={{ marginTop: 0 }}>
            <div className="explain-box-title">
              <span>🛡 Why the IT Admin Cannot Cheat in CamGuard</span>
              <span className="code-tag">TIDECLOAK IGA</span>
            </div>
            <p>
              Even though Victor K. has database root access and <code>manage-users</code> permission, TideCloak&apos;s{' '}
              <strong>Identity Governance &amp; Administration (IGA)</strong> intercepts any role assignment and wraps
              it into a <strong>Draft Change Request</strong> requiring <strong>2 of 3 Board Enclave signatures</strong>.
              Victor cannot sign his own request, and his attempt is immediately exposed on the public audit ledger.
            </p>
          </div>
        </div>

        {rogueResult && (
          <div className="explain-box crimson" style={{ marginTop: 16 }}>
            <div className="explain-box-title">
              <span>🛑 SELF-GRANT FROZEN AT 0/2 SIGNATURES (CR #{rogueResult.crId.slice(0, 12)})</span>
              <span className="code-tag">HTTP 403 QUORUM_NOT_MET</span>
            </div>
            <p style={{ marginBottom: 10 }}>{rogueResult.humanMessage}</p>
            <div className="btn-row">
              <Link href={`/viewer/${rogueResult.clipId}`} className="btn danger sm">
                🔒 Verify Player Still Rejects Victor K. (403)
              </Link>
              <Link href="/board" className="btn sm">
                🗳 Inspect Flagged Request on Board Console →
              </Link>
              <Link href="/audit" className="btn sm">
                📋 View Public Exposure in Audit Ledger →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Camera-Edge Encryption Architecture Explanation */}
      <div className="grid-3" style={{ marginBottom: 22 }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <span className="card-title">Stage 1 · Edge Capture</span>
            <span className="code-tag">AES-GCM-256</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Each camera seals video segments at the edge using a unique 96-bit initialization vector (IV) and 128-bit
            authentication tag before touching disk.
          </p>
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <span className="card-title">Stage 2 · Split Storage</span>
            <span className="code-tag">ZERO-PLAINTEXT</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            Anonymous motion counts (e.g. <em>&ldquo;1 vehicle entered B1&rdquo;</em>) go to the AI sensor log. The actual
            pixel frames are stored only as encrypted <code>.enc</code> blobs in <code>data/clips/</code>.
          </p>
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-header">
            <span className="card-title">Stage 3 · Threshold Key</span>
            <span className="code-tag">2/3 BOARD QUORUM</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
            The decryption endpoint verifies both a committed <code>2/2</code> Board Quorum record and the{' '}
            <code>cctv-viewer</code> capability before releasing a single frame.
          </p>
        </div>
      </div>

      {/* Vault Inventory Table */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="card-header">
          <div>
            <div className="card-title">Encrypted Camera Vault Inventory ({clips.length} Sealed Recordings)</div>
            <div className="card-sub">
              Every video file below is stored on disk as raw AES-GCM-256 ciphertext (`data/clips/*.json`)
            </div>
          </div>
          <span className="code-tag">REALM: CAMGUARD</span>
        </div>

        {loading ? (
          <p className="muted">Reading encrypted vault manifest…</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Clip ID &amp; Time Window</th>
                  <th>Camera &amp; Zone</th>
                  <th>Incident Title &amp; Anonymous AI Sensor Tag</th>
                  <th>Cipher Specification</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clips.map((c) => (
                  <tr key={c.clipId}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.clipId}</div>
                      <div className="muted">
                        {new Date(c.from).toLocaleTimeString()} ({c.frames} frames)
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.camera}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {c.zone}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.label}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {c.humanSummary}
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>
                      <span className="badge info">AES-GCM-256</span>
                      <div className="muted" style={{ marginTop: 4 }}>
                        Tag: cctv-viewer
                      </div>
                    </td>
                    <td>
                      <div className="btn-row">
                        <Link href={`/viewer/${c.clipId}`} className="btn sm">
                          👁 Inspect Cipher / Player
                        </Link>
                        <Link href={`/request?clip=${c.clipId}`} className="btn sm primary">
                          📜 Request Unlock
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
