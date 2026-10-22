// Shared domain types for CamGuard. Kept framework-free so both server (API
// routes, lib) and client (pages) can import them.

export type EventType =
  | 'vehicle_in'
  | 'vehicle_out'
  | 'door_open'
  | 'person_detected'
  | 'motion_after_hours'
  | 'parcel_drop'

export interface Camera {
  id: string
  name: string
  zone: string
  status?: 'ONLINE' | 'RESTRICTED'
}

export interface CamEvent {
  id: string
  ts: string // ISO8601 with +07:00
  camera: string
  zone: string
  type: EventType
  count: number
  plate_masked?: string
  note?: string
}

export type ClipScene = 'vehicle' | 'person' | 'parcel' | 'motion'

/** Public clip metadata — safe to hand to anyone. Never carries plaintext. */
export interface ClipMeta {
  clipId: string
  camera: string
  zone: string
  from: string
  to: string
  scene: ClipScene
  frames: number
  label: string
  humanSummary?: string
  plate_masked?: string
}

/**
 * On-disk clip. Only ciphertext is persisted. `cipher` is AES-GCM over the JSON
 * array of SVG frame strings; `iv` is the GCM nonce. Plaintext is released ONLY
 * when a request has achieved 2/3 Building Board Quorum and the caller holds
 * the `cctv-viewer` decryption authority.
 */
export interface StoredClip extends ClipMeta {
  alg: 'AES-GCM-256'
  iv: string
  cipher: string
}

export type RequestStatus =
  | 'PENDING_QUORUM'
  | 'APPROVED'
  | 'DENIED'
  | 'VIEWED'

export interface BoardVote {
  username: string
  displayName: string
  roleLabel: string
  decision: 'APPROVE' | 'DENY'
  timestamp: string
  signatureHash: string
}

export interface ViewRequest {
  id: string
  requester: string // preferred_username
  requesterDisplayName?: string
  requesterRole?: string
  requesterUserId: string // Tide user id (token sub) the role is granted to
  camera: string
  zone?: string
  clipId: string
  from: string
  to: string
  reason: string
  createdAt: string
  crId: string | null // TideCloak IGA change-request id
  status: RequestStatus
  source: 'ui' | 'assistant' | 'self-grant-attempt'
  isRogueAdminAttempt?: boolean
  votes?: BoardVote[]
  viewedAt?: string | null
}

/** Live quorum state for a request, combining TideCloak IGA state + enclave signatures. */
export interface QuorumState {
  crId: string | null
  crStatus: string | null // PENDING | APPROVED | DENIED | CANCELLED
  authorizationCount: number | null
  threshold: number | null
  readyToCommit: boolean
  approvers: { username: string; displayName?: string; roleLabel?: string; timestamp?: string | number; signatureHash?: string }[]
  committed: boolean
  error?: string
}

export interface AuditEntry {
  id: string
  ts: string
  actor: string
  actorRole?: string
  action:
    | 'REQUESTED'
    | 'APPROVED'
    | 'DENIED'
    | 'VIEWED'
    | 'AI_DENIED'
    | 'AI_ANSWERED'
    | 'ADMIN_BLOCKED'
    | 'BOARD_SIGNED'
    | 'INGESTED'
  detail: string
  humanExplanation?: string
  requestId?: string
  crId?: string | null
}

export interface DemoPersona {
  id: string
  username: string
  displayName: string
  badge: string
  roleTitle: string
  unitOrDept: string
  description: string
  humanNote: string
  roles: string[]
  isBoardMember?: boolean
  isTechAdmin?: boolean
  avatarCode: string
}

export const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: 'persona-maya-resident',
    username: 'maya.lin',
    displayName: 'Maya Lin',
    badge: 'RESIDENT',
    roleTitle: 'Resident · Apt 1205',
    unitOrDept: 'Tower A · Floor 12',
    description: 'Can ask the AI Concierge about building activity and submit public requests to review specific camera clips.',
    humanNote: 'Maya noticed her bicycle missing outside Apt 1205 at 21:43. She wants to check the hallway camera without invading neighbors\' privacy.',
    roles: ['cg-resident'],
    avatarCode: 'ML',
  },
  {
    id: 'persona-marcus-guard',
    username: 'marcus.vance',
    displayName: 'Marcus Vance',
    badge: 'SECURITY',
    roleTitle: 'Night Shift Security Officer',
    unitOrDept: 'Lobby Desk · Ground Floor',
    description: 'Monitors live sensor alerts and asks the AI about vehicle counts or doors, but cannot secretly pull raw video footage.',
    humanNote: 'In traditional buildings, a guard can watch any camera at will. With CamGuard, Marcus gets instant sensor answers but needs Board approval to view raw video.',
    roles: ['cg-resident'],
    avatarCode: 'MV',
  },
  {
    id: 'persona-victor-admin',
    username: 'victor.k',
    displayName: 'Victor K.',
    badge: 'IT ADMIN',
    roleTitle: 'Lead Systems Engineer',
    unitOrDept: 'Infrastructure & Storage',
    description: 'Manages servers and encrypted clip storage, yet holds zero decryption keys and cannot self-approve access.',
    humanNote: 'Even though Victor manages the database and TideCloak server, any attempt to grant himself the "cctv-viewer" role is trapped by Quorum Governance.',
    roles: ['cg-ingest', 'tide-realm-admin'],
    isTechAdmin: true,
    avatarCode: 'VK',
  },
  {
    id: 'persona-elena-board1',
    username: 'elena.rostova',
    displayName: 'Elena Rostova',
    badge: 'BOARD 1/3',
    roleTitle: 'Building Board Chair',
    unitOrDept: 'Governance Committee · Seat 1',
    description: 'Elected Building Board Chair. Can review public access requests and cast 1 of the 2 required quorum signatures.',
    humanNote: 'Elena alone cannot unlock a video (1/2 signatures is not enough). She must co-sign with at least one other board representative.',
    roles: ['cg-board', 'tide-realm-admin'],
    isBoardMember: true,
    avatarCode: 'ER',
  },
  {
    id: 'persona-david-board2',
    username: 'david.chen',
    displayName: 'David Chen',
    badge: 'BOARD 2/3',
    roleTitle: 'Resident Representative',
    unitOrDept: 'Governance Committee · Seat 2',
    description: 'Elected Resident Representative. When David co-signs alongside Elena (reaching 2/3 quorum), TideCloak commits the decryption role.',
    humanNote: 'David\'s second signature completes the 2/3 threshold. The requester\'s browser can now decrypt the requested clip.',
    roles: ['cg-board', 'tide-realm-admin'],
    isBoardMember: true,
    avatarCode: 'DC',
  },
]
