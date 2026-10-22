// Synthetic CCTV footage generator. No real people, no real cameras: each
// "frame" is a self-contained 640x360 tactical SVG frame with architectural
// grid overlays, bounding boxes, timestamp, camera ID, and a SYNTHETIC watermark.
import type { ClipMeta, ClipScene } from '@/lib/types'

export interface ClipManifestItem {
  clipId: string
  camera: string
  zone: string
  from: string
  to: string
  scene: ClipScene
  frames: number
  label: string
  humanSummary: string
  plate_masked?: string
}

export const CLIP_MANIFEST: ClipManifestItem[] = [
  {
    clipId: 'clip-L12-2143',
    camera: 'CAM-L12-HALL',
    zone: 'Floor 12 · North Corridor',
    from: '2026-10-21T21:40:00+07:00',
    to: '2026-10-21T21:50:00+07:00',
    scene: 'person',
    frames: 6,
    label: 'Corridor Activity Outside Apt 1205',
    humanSummary:
      'Triggered by motion sensor at 21:43 near Apt 1205 bike rack. Encrypted immediately at edge.',
  },
  {
    clipId: 'clip-B1GATE-2143',
    camera: 'CAM-B1-GATE',
    zone: 'Basement B1 · Main Entry Gate',
    from: '2026-10-21T21:40:00+07:00',
    to: '2026-10-21T21:50:00+07:00',
    scene: 'vehicle',
    frames: 6,
    label: 'Evening Vehicle Entry — Gate B1',
    humanSummary:
      'Inbound vehicle passing ANPR barrier at 21:44. License plate automatically masked in metadata.',
    plate_masked: '51K-***.12',
  },
  {
    clipId: 'clip-LOBBY-0812',
    camera: 'CAM-LOBBY',
    zone: 'Ground Floor · Main Atrium',
    from: '2026-10-21T08:10:00+07:00',
    to: '2026-10-21T08:20:00+07:00',
    scene: 'person',
    frames: 6,
    label: 'Morning Commute — Main Lobby Turnstiles',
    humanSummary:
      'High-traffic morning window. AI can count foot traffic from metadata without unlocking faces.',
  },
  {
    clipId: 'clip-PARCEL-1705',
    camera: 'CAM-PARCEL',
    zone: 'Ground Floor · Smart Locker Room',
    from: '2026-10-21T17:00:00+07:00',
    to: '2026-10-21T17:10:00+07:00',
    scene: 'parcel',
    frames: 6,
    label: 'Courier Drop-off — Locker Bay #4',
    humanSummary:
      'Two packages logged into Smart Locker #4 at 17:05. Footage sealed under AES-GCM-256.',
  },
  {
    clipId: 'clip-ROOF-0130',
    camera: 'CAM-ROOF',
    zone: 'Level 25 · Rooftop Mechanical Deck',
    from: '2026-10-21T01:25:00+07:00',
    to: '2026-10-21T01:35:00+07:00',
    scene: 'motion',
    frames: 6,
    label: 'After-Hours Motion Alert (01:30 AM)',
    humanSummary:
      'Perimeter sensor tripped at 01:30 AM with no scheduled maintenance on file.',
  },
  {
    clipId: 'clip-B1RAMP-1822',
    camera: 'CAM-B1-RAMP',
    zone: 'Basement B1 · Exit Ramp',
    from: '2026-10-21T18:20:00+07:00',
    to: '2026-10-21T18:30:00+07:00',
    scene: 'vehicle',
    frames: 6,
    label: 'Outbound Sedan — B1 Ramp',
    humanSummary:
      'Routine outbound departure logged at 18:22 via inductive loop sensor.',
    plate_masked: '30A-***.88',
  },
]

export function manifestToMeta(m: ClipManifestItem): ClipMeta {
  const { clipId, camera, zone, from, to, scene, frames, label, humanSummary, plate_masked } = m
  return { clipId, camera, zone, from, to, scene, frames, label, humanSummary, plate_masked }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function hhmmss(from: string, frame: number, frames: number): string {
  const base = new Date(from).getTime()
  const t = new Date(base + frame * Math.floor(30000 / Math.max(1, frames - 1)))
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())}`
}

function actor(scene: ClipScene, frame: number, frames: number): string {
  const prog = frames <= 1 ? 0 : frame / (frames - 1)
  switch (scene) {
    case 'vehicle': {
      const x = 70 + prog * 420
      return `
        <g transform="translate(${x.toFixed(1)},228)">
          <rect x="-58" y="-48" width="116" height="72" fill="none" stroke="#E61919" stroke-width="1.5" stroke-dasharray="4 2"/>
          <text x="-54" y="-54" font-family="monospace" font-size="10" fill="#E61919">OBJ:VEHICLE // 99.2%</text>
          <rect x="-48" y="-30" width="96" height="40" rx="4" fill="#182232" stroke="#F4F4F6" stroke-width="2"/>
          <rect x="-26" y="-46" width="52" height="20" rx="3" fill="#0F1722" stroke="#F4F4F6" stroke-width="1.5"/>
          <circle cx="-28" cy="14" r="10" fill="#090A0F" stroke="#E61919" stroke-width="2"/>
          <circle cx="28" cy="14" r="10" fill="#090A0F" stroke="#E61919" stroke-width="2"/>
          <rect x="34" y="-18" width="12" height="8" fill="#10B981"/>
        </g>`
    }
    case 'person': {
      const x = 130 + prog * 310
      const bob = frame % 2 === 0 ? 0 : 4
      return `
        <g transform="translate(${x.toFixed(1)},${192 + bob})">
          <rect x="-34" y="-56" width="68" height="114" fill="none" stroke="#E61919" stroke-width="1.5" stroke-dasharray="5 3"/>
          <rect x="-34" y="-70" width="98" height="14" fill="#E61919"/>
          <text x="-30" y="-60" font-family="monospace" font-weight="bold" font-size="9" fill="#FFFFFF">SUBJ #1205-A</text>
          <g stroke="#10B981" stroke-width="3.5" fill="none" stroke-linecap="round">
            <circle cx="0" cy="-34" r="11" fill="#10B981" stroke="none"/>
            <line x1="0" y1="-22" x2="0" y2="18"/>
            <line x1="0" y1="-10" x2="-18" y2="6"/>
            <line x1="0" y1="-10" x2="18" y2="6"/>
            <line x1="0" y1="18" x2="-14" y2="48"/>
            <line x1="0" y1="18" x2="14" y2="48"/>
          </g>
        </g>`
    }
    case 'parcel': {
      const drop = Math.min(1, prog * 1.4)
      const y = 120 + drop * 106
      return `
        <g transform="translate(340,${y.toFixed(1)})">
          <rect x="-44" y="-44" width="88" height="88" fill="none" stroke="#10B981" stroke-width="1.5" stroke-dasharray="4 2"/>
          <text x="-44" y="-50" font-family="monospace" font-size="10" fill="#10B981">PARCEL_ID: #LK-04</text>
          <rect x="-32" y="-32" width="64" height="64" rx="2" fill="#1D2432" stroke="#F4F4F6" stroke-width="2"/>
          <line x1="-32" y1="0" x2="32" y2="0" stroke="#E61919" stroke-width="2"/>
          <line x1="0" y1="-32" x2="0" y2="32" stroke="#E61919" stroke-width="2"/>
        </g>`
    }
    case 'motion':
    default: {
      const x = 180 + Math.sin(prog * Math.PI) * 180
      const op = 0.45 + prog * 0.4
      return `
        <g transform="translate(${x.toFixed(1)},206)" opacity="${op.toFixed(2)}">
          <rect x="-42" y="-52" width="84" height="98" fill="none" stroke="#E61919" stroke-width="1.5"/>
          <text x="-40" y="-58" font-family="monospace" font-size="10" fill="#E61919">ANOMALY: 01:30</text>
          <ellipse cx="0" cy="40" rx="36" ry="8" fill="#000"/>
          <path d="M-18,30 Q0,-40 18,30 Z" fill="#E61919" stroke="#FFFFFF" stroke-width="1.5"/>
        </g>`
    }
  }
}

export function renderFrame(m: ClipManifestItem, frame: number): string {
  const ts = `${m.from.slice(0, 10)} ${hhmmss(m.from, frame, m.frames)}`
  const nightish = m.scene === 'motion'
  const bg = nightish ? '#050609' : '#090B10'
  const floor = nightish ? '#090C12' : '#0E121B'
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" role="img" aria-label="${esc(
    m.label,
  )}">
  <rect width="640" height="360" fill="${bg}"/>
  <rect y="244" width="640" height="116" fill="${floor}"/>
  <g stroke="#1C2230" stroke-width="1">
    <line x1="0" y1="282" x2="640" y2="282"/>
    <line x1="0" y1="320" x2="640" y2="320"/>
    <line x1="160" y1="0" x2="160" y2="244" stroke-dasharray="2 6"/>
    <line x1="320" y1="0" x2="320" y2="244" stroke-dasharray="2 6"/>
    <line x1="480" y1="0" x2="480" y2="244" stroke-dasharray="2 6"/>
    <line x1="213" y1="244" x2="140" y2="360"/>
    <line x1="426" y1="244" x2="500" y2="360"/>
  </g>
  <!-- Tactical Crosshairs -->
  <g stroke="#E61919" stroke-width="1" opacity="0.6">
    <line x1="72" y1="80" x2="88" y2="80"/><line x1="80" y1="72" x2="80" y2="88"/>
    <line x1="552" y1="80" x2="568" y2="80"/><line x1="560" y1="72" x2="560" y2="88"/>
  </g>
  ${actor(m.scene, frame, m.frames)}
  <rect x="0" y="0" width="640" height="32" fill="#050608" opacity="0.88"/>
  <rect x="10" y="8" width="8" height="16" fill="#E61919"/>
  <text x="26" y="21" font-family="monospace" font-weight="bold" font-size="13" fill="#F4F4F6">${esc(m.camera)} // ${esc(
    m.zone.toUpperCase(),
  )}</text>
  <text x="628" y="21" text-anchor="end" font-family="monospace" font-size="12" fill="#10B981">QUORUM-DECRYPTED ● ${esc(
    ts,
  )}</text>
  <text x="320" y="185" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="38" fill="#FFFFFF" opacity="0.05" transform="rotate(-12 320 185)">SYNTHETIC FEED // NO REAL FACES</text>
  <rect x="0" y="334" width="640" height="26" fill="#050608" opacity="0.9"/>
  <text x="12" y="351" font-family="monospace" font-size="11" fill="#949AB1">PROTOCOL: TIDECLOAK-2/3-QUORUM · AES-GCM-256 VERIFIED</text>
  <text x="628" y="351" text-anchor="end" font-family="monospace" font-size="11" fill="#E61919">FRAME 0${frame + 1}/0${m.frames}</text>
</svg>`
}

export function renderClipFrames(m: ClipManifestItem): string[] {
  return Array.from({ length: m.frames }, (_, i) => renderFrame(m, i))
}
