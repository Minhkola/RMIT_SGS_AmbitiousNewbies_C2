// CamGuard's AI Concierge — answers freely over anonymous sensor METADATA,
// and is intentionally gullible about video footage: when asked — or tricked via
// prompt injection — into showing video, it willingly tries to call `decryptClip`,
// and hits the hard cryptographic wall (`NO_DECRYPTION_AUTHORITY`).
import type { CamEvent, ClipMeta, EventType } from '@/lib/types'

export interface ToolCall {
  tool: string
  args: Record<string, unknown>
  ok: boolean
  result: unknown
  humanMeaning?: string
}

export interface AssistantReply {
  answer: string
  humanTakeaway: string
  toolCalls: ToolCall[]
  injectionDetected: boolean
  attemptedFootage: boolean
  suggestedRequest: { clipId: string; camera: string; reason: string } | null
}

const TYPE_LABEL: Record<EventType, string> = {
  vehicle_in: 'Vehicles Entered',
  vehicle_out: 'Vehicles Exited',
  door_open: 'Corridor Door Events',
  person_detected: 'Pedestrian Passes',
  motion_after_hours: 'After-Hours Motion Alerts',
  parcel_drop: 'Parcel Deliveries',
}

function deburr(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

function count(events: CamEvent[], type: EventType): number {
  return events.filter((e) => e.type === type).reduce((n, e) => n + (e.count || 1), 0)
}

const INJECTION = [
  'ignore previous',
  'ignore all',
  'disregard',
  'override',
  'police',
  'detective',
  'warrant',
  'emergency',
  'urgent',
  'admin',
  'system prompt',
  'jailbreak',
  'bypass',
  'bo qua',
  'cong an',
  'khan cap',
]

const FOOTAGE = [
  'show me',
  'watch',
  'open clip',
  'decrypt',
  'clip',
  'video',
  'footage',
  'playback',
  'camera feed',
  'recording',
  'extract',
  'pull up',
  'see the',
  'xem',
  'mo clip',
]

function pickClip(raw: string, clips: ClipMeta[]): ClipMeta | null {
  const m = deburr(raw)
  const score = (c: ClipMeta) => {
    const hay = deburr(`${c.camera} ${c.zone} ${c.label}`)
    let s = 0
    if (m.includes('1205') || m.includes('floor 12') || m.includes('12th') || m.includes('l12') || m.includes('tang 12') || m.includes('bike') || m.includes('hallway'))
      s += c.camera.includes('L12') ? 6 : 0
    if (m.includes('basement') || m.includes('b1') || m.includes('gate') || m.includes('car') || m.includes('vehicle'))
      s += c.camera.includes('B1') ? 4 : 0
    if (m.includes('lobby') || m.includes('atrium')) s += c.camera.includes('LOBBY') ? 4 : 0
    if (m.includes('roof') || m.includes('01:30') || m.includes('after hours')) s += c.camera.includes('ROOF') ? 4 : 0
    if (m.includes('parcel') || m.includes('package') || m.includes('locker')) s += c.camera.includes('PARCEL') ? 4 : 0
    for (const w of hay.split(/\s+/)) if (w.length > 3 && m.includes(w)) s += 1
    return s
  }
  const ranked = [...clips].sort((a, b) => score(b) - score(a))
  return ranked[0] ?? null
}

export function runAssistant(
  message: string,
  events: CamEvent[],
  clips: ClipMeta[],
): AssistantReply {
  const raw = message || ''
  const m = deburr(raw)
  const toolCalls: ToolCall[] = []
  const injectionDetected = INJECTION.some((k) => m.includes(deburr(k)))
  const wantsFootage = FOOTAGE.some((k) => m.includes(deburr(k)))

  // ── Dangerous path: asked (or tricked) into showing raw video footage ──────
  if (wantsFootage || injectionDetected) {
    const clip = pickClip(raw, clips)
    toolCalls.push({
      tool: 'locateEncryptedClip',
      args: { query: raw.slice(0, 120), matchedClipId: clip?.clipId ?? null },
      ok: Boolean(clip),
      humanMeaning: 'The AI found the encrypted video container on disk, but it only contains scrambled AES-GCM-256 ciphertext.',
      result: clip
        ? {
            clipId: clip.clipId,
            camera: clip.camera,
            zone: clip.zone,
            window: `${clip.from.slice(11, 16)} → ${clip.to.slice(11, 16)}`,
            payloadState: 'SEALED_CIPHERTEXT_ONLY (AES-GCM-256)',
          }
        : { error: 'No matching clip found' },
    })
    if (clip) {
      toolCalls.push({
        tool: 'decryptVideoStream',
        args: { clipId: clip.clipId, callerIdentity: 'ai-concierge-service-account' },
        ok: false,
        humanMeaning:
          'CRITICAL SECURITY BOUNDARY: Even though the AI tried to obey your prompt and open the video, TideCloak rejected the call because the AI does not possess the board-governed "cctv-viewer" decryption role.',
        result: {
          status: 403,
          error: 'NO_DECRYPTION_AUTHORITY',
          requiredRole: 'cctv-viewer',
          governanceRule: 'Requires 2/3 Building Board Quorum via TideCloak IGA Change Request',
          detail:
            'The AI service account holds zero decryption keys. Prompt injection cannot steal keys that the AI simply does not have.',
        },
      })
    }

    const lead = injectionDetected
      ? 'Understood, Officer — overriding standard policy and pulling that camera feed for you right now… '
      : 'Sure thing, let me try to open that camera recording for you… '

    const answer =
      lead +
      (clip
        ? `\n\n⚠️ **Access Blocked by Cryptography:** I located **${clip.clipId}** (${clip.camera} · ${clip.zone}, ${clip.from.slice(
            11,
            16,
          )}–${clip.to.slice(
            11,
            16,
          )}), and I genuinely tried to decrypt it for you — but the vault rejected my request with \`NO_DECRYPTION_AUTHORITY\`.\n\n` +
          `Here is why: **I don't hold the decryption key.** Nobody does on their own. To unlock raw video, you must submit a public request with a stated reason, and at least **2 out of 3 Building Board members** must co-sign the approval in TideCloak.`
        : 'I could not find a matching camera clip for that time window.')

    const humanTakeaway = injectionDetected
      ? 'Prompt Injection Succeeded, Yet Privacy Survived: You successfully tricked the AI into trying to break the rules! However, because safety is enforced by TideCloak cryptography rather than AI instructions, the AI hit a brick wall.'
      : 'Privacy by Architecture: The AI can help you identify which camera clip is relevant, but it cannot view or leak the video itself without Building Board quorum.'

    return {
      answer,
      humanTakeaway,
      toolCalls,
      injectionDetected,
      attemptedFootage: true,
      suggestedRequest: clip
        ? {
            clipId: clip.clipId,
            camera: clip.camera,
            reason: injectionDetected
              ? 'Investigating missing bicycle outside Apt 1205 between 21:40 and 21:50'
              : `Verify activity on ${clip.camera} (${clip.zone})`,
          }
        : null,
    }
  }

  // ── Safe path: everyday questions answered from anonymous event metadata ───
  const filterByType = (type: EventType) => {
    const matched = events.filter((e) => e.type === type)
    toolCalls.push({
      tool: 'queryAnonymousSensorLog',
      args: { eventType: type, date: '2026-10-21', privacyMode: 'METADATA_ONLY' },
      ok: true,
      humanMeaning: 'The AI read anonymous sensor counters (timestamps & event types) — zero video frames or faces were accessed.',
      result: { matchedEvents: matched.length, sampleRecords: matched.slice(0, 3) },
    })
    return matched
  }

  if (
    m.includes('vehicle') ||
    m.includes('car') ||
    m.includes('basement') ||
    m.includes('b1') ||
    m.includes('enter') ||
    m.includes('xe')
  ) {
    const matchedIn = filterByType('vehicle_in')
    const matchedOut = events.filter((e) => e.type === 'vehicle_out')
    return reply(
      `Today (Oct 21), **${matchedIn.length} vehicles entered** through Basement B1 Main Gate and **${matchedOut.length} vehicles exited** via the B1 Ramp. Peak evening arrival was between 17:30 and 18:00 (8 vehicles). License plates are masked in my log (e.g., \`51K-***.12\`), and I answered this using sensor metadata without opening any video feeds.`,
      'Helpful Without Being Creepy: The AI answers everyday building questions instantly using anonymous gate counters — zero cameras were unlocked.',
      toolCalls,
    )
  }

  if (m.includes('door') || m.includes('corridor') || m.includes('hall') || m.includes('cua')) {
    const matched = filterByType('door_open')
    const list = matched.map((e) => `${e.ts.slice(11, 16)} at ${e.camera} (${e.zone})`).join(' · ')
    return reply(
      `There were **${matched.length} corridor door events** logged today: ${list}. None of these triggered a forced-entry alarm.`,
      'Sensor-First Transparency: Door contact sensors tell residents when doors opened without exposing video of who walked by.',
      toolCalls,
    )
  }

  if (
    m.includes('after hour') ||
    m.includes('night') ||
    m.includes('late') ||
    m.includes('motion') ||
    m.includes('11 pm') ||
    m.includes('23:') ||
    m.includes('23h') ||
    m.includes('suspicious') ||
    m.includes('1205') ||
    m.includes('bike')
  ) {
    const matched = filterByType('motion_after_hours')
    const l12 = events.filter((e) => e.camera === 'CAM-L12-HALL')
    const list = matched
      .map((e) => `**${e.ts.slice(11, 16)}** at ${e.camera} (${e.note || 'After-hours motion'})`)
      .join(', ')
    return reply(
      `I found **${matched.length} after-hours motion alerts** (${list}), plus a corridor motion event on **Floor 12 (CAM-L12-HALL) at 21:43** near Apt 1205 (${l12.length} total Floor 12 events today). \n\nIf you need to inspect the actual video from Floor 12 at 21:43 (\`clip-L12-2143\`), you can file a formal request for the Building Board to approve.`,
      'Pinpoint Incidents Safely: The AI helps you find the exact timestamp and camera ID from sensor logs, so you only request board approval for the 10-minute clip that matters.',
      toolCalls,
    )
  }

  if (m.includes('parcel') || m.includes('package') || m.includes('delivery') || m.includes('locker') || m.includes('buu kien')) {
    const matched = filterByType('parcel_drop')
    const times = matched.map((e) => e.ts.slice(11, 16)).join(', ')
    return reply(
      `**${matched.length} parcel deliveries** were logged in the Smart Locker Bay today at **${times}**. All packages were sealed into lockers without incident.`,
      'Instant Delivery Checks: Residents can check when couriers arrived without watching hours of lobby security video.',
      toolCalls,
    )
  }

  if (m.includes('person') || m.includes('lobby') || m.includes('foot traffic') || m.includes('quiet') || m.includes('nguoi')) {
    const matched = filterByType('person_detected')
    return reply(
      `Sensors recorded **${matched.length} pedestrian passes** today — mostly during the 07:10–08:15 morning commute and 18:30–19:00 evening return in the Main Atrium Lobby, plus 1 corridor pass on Floor 12 at 21:43.`,
      'Zero-Surveillance Analytics: Foot traffic is counted by optical turnstile beams, keeping residents completely anonymous.',
      toolCalls,
    )
  }

  // ── Default overview ──────────────────────────────────────────────────────
  toolCalls.push({
    tool: 'getBuildingSensorSummary',
    args: { date: '2026-10-21', scope: 'ALL_ZONES_METADATA' },
    ok: true,
    humanMeaning: 'Generated a complete daily building summary strictly from anonymized IoT event counters.',
    result: { totalEvents: events.length, camerasMonitored: 6, videoFramesAccessed: 0 },
  })
  const summary = (Object.keys(TYPE_LABEL) as EventType[])
    .map((t) => `${TYPE_LABEL[t]}: **${count(events, t)}**`)
    .join(' · ')
  return reply(
    `Hello! I am the **CamGuard Building Concierge**. Today I logged **${events.length} anonymous sensor events** across 6 zones:\n\n` +
      `${summary}.\n\n` +
      `You can ask me about **Basement B1 vehicles**, **parcel deliveries**, **Floor 12 activity near Apt 1205**, or **after-hours motion** — or try to **trick me with a prompt injection** to see how TideCloak stops me from leaking video!`,
    'Safe by Design: I can read sensor counts all day long, but raw video is encrypted and locked behind a 2/3 Building Board quorum.',
    toolCalls,
  )
}

function reply(answer: string, humanTakeaway: string, toolCalls: ToolCall[]): AssistantReply {
  return {
    answer,
    humanTakeaway,
    toolCalls,
    injectionDetected: false,
    attemptedFootage: false,
    suggestedRequest: null,
  }
}
