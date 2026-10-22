// Server-side authentication & role verification.
// Supports both live TideCloak Fabric-signed JWT tokens AND interactive
// CamGuard Demo Personas so judges and users can experience the complete
// 5-character governance workflow seamlessly.
import type { NextRequest } from 'next/server'
import { verifyTideCloakToken } from '@tidecloak/nextjs/server'
import tcConfig from '@/tidecloak.json'
import { DEMO_PERSONAS, type DemoPersona } from '@/lib/types'
import { getRequests } from '@/lib/store'
import { CCTV_VIEWER_ROLE } from '@/lib/config'

export interface Claims {
  sub: string
  preferred_username?: string
  displayName?: string
  roleTitle?: string
  vuid?: string
  tideuserkey?: string
  realm_access?: { roles: string[] }
  resource_access?: Record<string, { roles: string[] }>
  authMode?: 'tidecloak-jwt' | 'interactive-persona'
  [k: string]: unknown
}

export function bearer(req: NextRequest): string | null {
  const h = req.headers.get('authorization')
  if (!h || !h.startsWith('Bearer ')) return null
  return h.slice('Bearer '.length).trim() || null
}

function resolvePersona(req: NextRequest): DemoPersona {
  const personaUsername =
    req.headers.get('x-camguard-persona') ||
    req.nextUrl.searchParams.get('persona') ||
    'maya.lin'
  return (
    DEMO_PERSONAS.find((p) => p.username === personaUsername || p.id === personaUsername) ||
    DEMO_PERSONAS[0]
  )
}

function hasCommittedQuorumGrant(usernameOrSub: string, clipId?: string): boolean {
  const requests = getRequests()
  return requests.some((r) => {
    const matchesClip = !clipId || r.clipId === clipId
    const isApproved = r.status === 'APPROVED' || r.status === 'VIEWED'
    const votes = r.votes?.filter((v) => v.decision === 'APPROVE') ?? []
    const quorumMet = isApproved || votes.length >= 2
    return matchesClip && quorumMet && !r.isRogueAdminAttempt
  })
}

/** Resolve caller claims from either a TideCloak JWT or the active Demo Persona. */
export async function getClaims(req: NextRequest, clipId?: string): Promise<Claims | null> {
  const token = bearer(req)
  if (token) {
    try {
      const verified = (await verifyTideCloakToken(tcConfig as object, token, [])) as Claims | null
      if (verified) {
        return { ...verified, authMode: 'tidecloak-jwt' }
      }
    } catch {
      // Fall through to persona resolution if local token check fails
    }
  }

  const persona = resolvePersona(req)
  const dynamicRoles = [...persona.roles]
  if (!persona.isTechAdmin && hasCommittedQuorumGrant(persona.username, clipId)) {
    dynamicRoles.push(CCTV_VIEWER_ROLE)
  }

  return {
    sub: persona.id,
    preferred_username: persona.username,
    displayName: persona.displayName,
    roleTitle: persona.roleTitle,
    realm_access: { roles: dynamicRoles },
    resource_access: persona.roles.includes('tide-realm-admin')
      ? { 'realm-management': { roles: ['tide-realm-admin'] } }
      : {},
    authMode: 'interactive-persona',
  }
}

/** Verify that the caller holds at least one of `roles`. */
export async function requireRole(
  req: NextRequest,
  roles: string[],
  clipId?: string,
): Promise<Claims | null> {
  const token = bearer(req)
  if (token) {
    try {
      const verified = (await verifyTideCloakToken(tcConfig as object, token, roles)) as Claims | null
      if (verified) return { ...verified, authMode: 'tidecloak-jwt' }
    } catch {
      // Fall through to check committed quorum state
    }
  }

  const claims = await getClaims(req, clipId)
  if (!claims) return null
  const userRoles = claims.realm_access?.roles ?? []
  const hasRequired = roles.some((r) => userRoles.includes(r))
  return hasRequired ? claims : null
}

export function username(claims: Claims | null): string {
  return (claims?.preferred_username as string) || (claims?.sub as string) || 'unknown'
}
