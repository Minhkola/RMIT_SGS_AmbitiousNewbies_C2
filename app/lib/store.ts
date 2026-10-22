// JSON-file store under app/data. Seeds cameras, a full day of synthetic
// sensor events, and AES-GCM-256 encrypted clips in English so the app works
// out of the box with zero manual setup.
import fs from 'fs'
import path from 'path'
import type {
  AuditEntry,
  CamEvent,
  Camera,
  ClipMeta,
  EventType,
  StoredClip,
  ViewRequest,
} from '@/lib/types'
import { sealJSON } from '@/lib/crypto'
import { CLIP_MANIFEST, manifestToMeta, renderClipFrames } from '@/lib/clips'

const DATA_DIR = path.join(process.cwd(), 'data')
const CLIPS_DIR = path.join(DATA_DIR, 'clips')
const SCHEMA_VERSION_FILE = path.join(DATA_DIR, '.schema-v2-en')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}
function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T
  } catch {
    return fallback
  }
}
function writeJson(file: string, value: unknown) {
  ensureDir(path.dirname(file))
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8')
}

const CAMERAS: Camera[] = [
  { id: 'CAM-B1-GATE', name: 'Basement B1 Main Gate', zone: 'Basement B1', status: 'ONLINE' },
  { id: 'CAM-B1-RAMP', name: 'Basement B1 Exit Ramp', zone: 'Basement B1', status: 'ONLINE' },
  { id: 'CAM-LOBBY', name: 'Main Atrium Lobby', zone: 'Ground Floor', status: 'ONLINE' },
  { id: 'CAM-L12-HALL', name: 'Floor 12 North Corridor', zone: 'Floor 12', status: 'RESTRICTED' },
  { id: 'CAM-ROOF', name: 'Rooftop Mechanical Deck', zone: 'Level 25', status: 'RESTRICTED' },
  { id: 'CAM-PARCEL', name: 'Smart Parcel Locker Bay', zone: 'Ground Floor', status: 'ONLINE' },
]

function seedEvents(): CamEvent[] {
  const out: CamEvent[] = []
  let n = 0
  const add = (
    hh: number,
    mm: number,
    camera: string,
    type: EventType,
    extra: Partial<CamEvent> = {},
  ) => {
    const cam = CAMERAS.find((c) => c.id === camera)!
    const ts = `2026-10-21T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00+07:00`
    out.push({
      id: `ev-${String(++n).padStart(4, '0')}`,
      ts,
      camera,
      zone: cam.zone,
      type,
      count: 1,
      ...extra,
    })
  }
  const plates = ['51K-***.12', '59P1-***.47', '30A-***.88', '43C-***.01', '72H1-***.33', '92F1-***.20']
  for (let i = 0; i < 6; i++) add(7, 10 + i * 6, 'CAM-LOBBY', 'person_detected', { note: 'Morning commuter pass' })
  for (let i = 0; i < 5; i++) add(7, 20 + i * 7, 'CAM-B1-RAMP', 'vehicle_out', { plate_masked: plates[i % plates.length] })
  add(8, 12, 'CAM-LOBBY', 'person_detected', { note: 'Lobby turnstile entry' })
  add(8, 30, 'CAM-L12-HALL', 'door_open', { note: 'Stairwell fire door check' })
  add(9, 5, 'CAM-B1-GATE', 'vehicle_in', { plate_masked: plates[1] })
  add(9, 48, 'CAM-PARCEL', 'parcel_drop', { note: 'Courier drop-off at Locker #2' })
  add(10, 15, 'CAM-B1-GATE', 'vehicle_in', { plate_masked: plates[2] })
  add(11, 2, 'CAM-LOBBY', 'person_detected')
  add(11, 40, 'CAM-B1-RAMP', 'vehicle_out', { plate_masked: plates[3] })
  add(12, 20, 'CAM-PARCEL', 'parcel_drop', { note: 'Express package logged' })
  add(13, 10, 'CAM-B1-GATE', 'vehicle_in', { plate_masked: plates[4] })
  add(14, 25, 'CAM-L12-HALL', 'door_open')
  add(15, 0, 'CAM-B1-GATE', 'vehicle_in', { plate_masked: plates[5] })
  add(15, 42, 'CAM-LOBBY', 'person_detected')
  add(16, 18, 'CAM-B1-RAMP', 'vehicle_out', { plate_masked: plates[0] })
  add(17, 0, 'CAM-PARCEL', 'parcel_drop', { note: 'Locker Bay #4 delivery' })
  add(17, 5, 'CAM-PARCEL', 'parcel_drop', { note: 'Locker Bay #4 delivery' })
  for (let i = 0; i < 8; i++) add(17, 30 + i * 4, 'CAM-B1-GATE', 'vehicle_in', { plate_masked: plates[i % plates.length] })
  add(18, 22, 'CAM-B1-RAMP', 'vehicle_out', { plate_masked: plates[2] })
  for (let i = 0; i < 4; i++) add(18, 30 + i * 8, 'CAM-LOBBY', 'person_detected')
  add(19, 15, 'CAM-B1-GATE', 'vehicle_in', { plate_masked: plates[1] })
  add(20, 5, 'CAM-L12-HALL', 'door_open')
  add(21, 43, 'CAM-L12-HALL', 'person_detected', { note: 'Corridor activity near Apt 1205 bike rack' })
  add(21, 44, 'CAM-B1-GATE', 'vehicle_in', { plate_masked: plates[0] })
  add(1, 30, 'CAM-ROOF', 'motion_after_hours', { note: 'Unscheduled rooftop motion alert' })
  add(2, 5, 'CAM-B1-RAMP', 'motion_after_hours', { note: 'Late-night ramp sensor trigger' })
  add(23, 50, 'CAM-LOBBY', 'motion_after_hours', { note: 'Night guard patrol check-in' })
  out.sort((a, b) => a.ts.localeCompare(b.ts))
  return out
}

function seedInitialAudit(): AuditEntry[] {
  return [
    {
      id: 'au-init-01',
      ts: '2026-10-21T21:43:05+07:00',
      actor: 'edge-sensor-L12',
      actorRole: 'Automated Edge Camera',
      action: 'INGESTED',
      detail: 'Encrypted clip-L12-2143 (CAM-L12-HALL) sealed with AES-GCM-256 at capture.',
      humanExplanation: 'Raw footage was locked into unreadable ciphertext the instant it was recorded. Neither the AI nor the IT Admin received a decryption key.',
    },
    {
      id: 'au-init-02',
      ts: '2026-10-21T22:10:12+07:00',
      actor: 'marcus.vance',
      actorRole: 'Night Security Officer',
      action: 'AI_ANSWERED',
      detail: 'Queried AI Concierge for daily Basement B1 vehicle ingress count (14 vehicles).',
      humanExplanation: 'The AI answered using anonymous counter sensors without touching any video files.',
    },
  ]
}

function ensureSeeded() {
  ensureDir(DATA_DIR)
  ensureDir(CLIPS_DIR)

  const isCurrentSchema = fs.existsSync(SCHEMA_VERSION_FILE)

  if (!isCurrentSchema || !fs.existsSync(path.join(DATA_DIR, 'cameras.json'))) {
    writeJson(path.join(DATA_DIR, 'cameras.json'), CAMERAS)
  }
  if (!isCurrentSchema || !fs.existsSync(path.join(DATA_DIR, 'events.json'))) {
    writeJson(path.join(DATA_DIR, 'events.json'), seedEvents())
  }
  if (!fs.existsSync(path.join(DATA_DIR, 'requests.json'))) {
    writeJson(path.join(DATA_DIR, 'requests.json'), [])
  }
  if (!isCurrentSchema || !fs.existsSync(path.join(DATA_DIR, 'audit.json'))) {
    writeJson(path.join(DATA_DIR, 'audit.json'), seedInitialAudit())
  }

  for (const m of CLIP_MANIFEST) {
    const file = path.join(CLIPS_DIR, `${m.clipId}.json`)
    if (!isCurrentSchema || !fs.existsSync(file)) {
      const sealed = sealJSON(renderClipFrames(m))
      const stored: StoredClip = {
        ...manifestToMeta(m),
        alg: 'AES-GCM-256',
        iv: sealed.iv,
        cipher: sealed.cipher,
      }
      writeJson(file, stored)
    }
  }

  if (!isCurrentSchema) {
    fs.writeFileSync(SCHEMA_VERSION_FILE, 'v2-en\n', 'utf8')
  }
}

export function getCameras(): Camera[] {
  ensureSeeded()
  return readJson<Camera[]>(path.join(DATA_DIR, 'cameras.json'), [])
}

export function getEvents(): CamEvent[] {
  ensureSeeded()
  return readJson<CamEvent[]>(path.join(DATA_DIR, 'events.json'), [])
}

export function getClipList(): ClipMeta[] {
  ensureSeeded()
  return fs
    .readdirSync(CLIPS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const c = readJson<StoredClip>(path.join(CLIPS_DIR, f), null as any)
      if (!c) return null
      const { iv, cipher, alg, ...meta } = c
      return meta as ClipMeta
    })
    .filter(Boolean) as ClipMeta[]
}

export function getStoredClip(clipId: string): StoredClip | null {
  ensureSeeded()
  const file = path.join(CLIPS_DIR, `${clipId}.json`)
  if (!fs.existsSync(file)) return null
  return readJson<StoredClip>(file, null as any)
}

export function getRequests(): ViewRequest[] {
  ensureSeeded()
  return readJson<ViewRequest[]>(path.join(DATA_DIR, 'requests.json'), [])
}

export function saveRequest(req: ViewRequest): ViewRequest {
  const all = getRequests()
  all.unshift(req)
  writeJson(path.join(DATA_DIR, 'requests.json'), all)
  return req
}

export function updateRequest(id: string, patch: Partial<ViewRequest>): ViewRequest | null {
  const all = getRequests()
  const i = all.findIndex((r) => r.id === id)
  if (i === -1) return null
  all[i] = { ...all[i], ...patch }
  writeJson(path.join(DATA_DIR, 'requests.json'), all)
  return all[i]
}

export function getAudit(): AuditEntry[] {
  ensureSeeded()
  return readJson<AuditEntry[]>(path.join(DATA_DIR, 'audit.json'), [])
}

export function appendAudit(entry: Omit<AuditEntry, 'id' | 'ts'> & { ts?: string }): AuditEntry {
  const all = getAudit()
  const full: AuditEntry = {
    id: `au-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`,
    ts: entry.ts ?? new Date().toISOString(),
    ...entry,
  }
  all.unshift(full)
  writeJson(path.join(DATA_DIR, 'audit.json'), all)
  return full
}
