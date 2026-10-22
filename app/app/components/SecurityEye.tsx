'use client'

import React, { useState } from 'react'

export type EyeMode = 'scanning' | 'blocked' | 'unlocked'

export default function SecurityEye({
  mode = 'scanning',
  compact = false,
}: {
  mode?: EyeMode
  compact?: boolean
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 14
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 10
    setOffset({ x: nx, y: ny })
  }

  const resetMove = () => setOffset({ x: 0, y: 0 })

  // Deterministic halftone pixel coordinates forming the poster's iconic eye/iris ring
  const cols = 38
  const rows = compact ? 14 : 18
  const cx = (cols - 1) / 2
  const cy = (rows - 1) / 2

  const dots: { x: number; y: number; size: number; ring: 'outer' | 'iris' | 'glint' }[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dx = (c - cx) / 1.45
      const dy = (r - cy) * 1.15
      const dist = Math.sqrt(dx * dx + dy * dy)
      // Eye almond contour + iris ring
      const almond = Math.abs(dy) < 7.2 * Math.cos((dx / 14.5) * (Math.PI / 2))
      if (!almond) continue

      if (dist > 3.1 && dist < 6.4) {
        const checker = (r + c) % 2 === 0 || (dist > 4.0 && dist < 5.4)
        if (checker) {
          dots.push({ x: c, y: r, size: dist > 4.2 && dist < 5.3 ? 1 : 0.72, ring: 'iris' })
        }
      } else if (dist >= 6.4 && dist < 9.8) {
        if ((r * 3 + c * 5) % 3 !== 0) {
          dots.push({ x: c, y: r, size: 0.65, ring: 'outer' })
        }
      }
    }
  }

  const accentColor =
    mode === 'blocked' ? '#E61919' : mode === 'unlocked' ? '#10B981' : '#E61919'

  return (
    <div
      className={`cg-eye-panel ${mode} ${compact ? 'compact' : ''}`}
      onMouseMove={handleMove}
      onMouseLeave={resetMove}
    >
      <div className="cg-coord-row">
        <span>N1</span>
        <span>N2</span>
        <span>N3</span>
        <span>N4</span>
        <span>N5</span>
      </div>

      <div className="cg-eye-canvas">
        <svg
          viewBox={`0 0 ${cols * 10} ${rows * 10}`}
          className="cg-eye-svg"
          role="img"
          aria-label="CamGuard Cryptographic Privacy Lens"
        >
          {/* Background dark void inside the eye */}
          <rect width={cols * 10} height={rows * 10} fill="#08090D" />

          {/* Subtle scanline grid */}
          <g stroke="rgba(255,255,255,0.05)" strokeWidth="1">
            {Array.from({ length: 8 }, (_, i) => (
              <line key={i} x1={0} y1={i * 24} x2={cols * 10} y2={i * 24} />
            ))}
          </g>

          {/* Halftone pixel matrix */}
          <g fill="#F3F3F1">
            {dots.map((d, i) => {
              const s = d.size * 6.5
              const pad = (10 - s) / 2
              return (
                <rect
                  key={i}
                  x={d.x * 10 + pad + (d.ring === 'iris' ? offset.x * 0.35 : 0)}
                  y={d.y * 10 + pad + (d.ring === 'iris' ? offset.y * 0.35 : 0)}
                  width={s}
                  height={s}
                  opacity={d.ring === 'iris' ? 0.92 : 0.45}
                />
              )
            })}
          </g>

          {/* Iconic twin offset squares in the center pupil (directly from the reference poster) */}
          <g transform={`translate(${cx * 10 + offset.x}, ${cy * 10 + offset.y})`}>
            {/* White glint pixel */}
            <rect x={-34} y={-24} width={9} height={9} fill="#FFFFFF" />
            {/* Main Crimson/Emerald pupil square */}
            <rect
              x={-16}
              y={-12}
              width={32}
              height={32}
              fill={accentColor}
              className="cg-pupil-main"
            />
            {/* Secondary offset corner square */}
            <rect
              x={16}
              y={-28}
              width={18}
              height={18}
              fill={accentColor}
              className="cg-pupil-sub"
            />
          </g>

          {/* Corner Tactical Crosshairs */}
          <g stroke={accentColor} strokeWidth="1.5" opacity="0.85">
            <line x1="12" y1="18" x2="28" y2="18" />
            <line x1="20" y1="10" x2="20" y2="26" />
            <line x1={cols * 10 - 28} y1="18" x2={cols * 10 - 12} y2="18" />
            <line x1={cols * 10 - 20} y1="10" x2={cols * 10 - 20} y2="26" />
          </g>
        </svg>

        <div className="cg-eye-overlay-tag">
          <span className="cg-pulse-dot" style={{ background: accentColor }} />
          {mode === 'blocked'
            ? 'LENS STATE: CRYPTOGRAPHICALLY LOCKED // NO_DECRYPTION_AUTHORITY'
            : mode === 'unlocked'
            ? 'LENS STATE: 2/3 BOARD QUORUM VERIFIED // STREAM DECRYPTED'
            : 'LENS STATE: METADATA SENSOR MODE // RAW VIDEO SEALED (AES-GCM-256)'}
        </div>
      </div>

      <div className="cg-eye-footer">
        <div className="cg-eye-mandate">
          FAILURE TO OBTAIN 2/3 COMMUNITY QUORUM RENDERS ALL RAW VIDEO MATHEMATICALLY UNREADABLE TO AI, GUARDS, AND IT ADMINS.
        </div>
        <div className="cg-eye-stamp">
          <span>AUTHORIZED: TIDECLOAK IGA</span>
          <span className="cg-red-text">STAY ALERT. TRUST MATH. FOLLOW PROTOCOL.</span>
        </div>
      </div>
    </div>
  )
}
