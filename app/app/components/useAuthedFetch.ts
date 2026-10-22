'use client'

import { useCallback } from 'react'
import { useTideCloak } from '@tidecloak/nextjs'
import { useAppContext } from '@/app/components/AppContext'

// Attaches both the active TideCloak Bearer token (if logged in via OIDC)
// AND the active CamGuard Persona header (`X-CamGuard-Persona`) so every page
// works seamlessly whether demonstrating via the 5-persona switcher or SSO.
export function useAuthedFetch() {
  const { token } = useTideCloak()
  const { persona } = useAppContext()

  return useCallback(
    async (input: string, init: RequestInit = {}) => {
      const headers = new Headers(init.headers || {})
      if (token) headers.set('Authorization', `Bearer ${token}`)
      if (persona?.username) headers.set('X-CamGuard-Persona', persona.username)
      if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
      return fetch(input, { ...init, headers, cache: 'no-store' })
    },
    [token, persona?.username],
  )
}
