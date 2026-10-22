'use client'

import type { ReactNode } from 'react'
import { useAppContext } from '@/app/components/AppContext'
import { DEMO_PERSONAS } from '@/lib/types'

// Humanized Role Context Banner & Gate.
// Never locks the user out of exploring the demo; instead, clearly shows whose
// shoes they are standing in and offers a 1-click switch if a page is tailored
// for a different role (e.g., Building Board or IT Systems Engineer).
export default function RoleGate({
  children,
  needRole,
  hint,
}: {
  children: ReactNode
  needRole?: string
  hard?: boolean
  hint?: string
}) {
  const { persona, setPersonaByUsername } = useAppContext()

  const hasRole = !needRole || persona.roles.includes(needRole)

  const recommendedPersona = needRole
    ? DEMO_PERSONAS.find((p) => p.roles.includes(needRole))
    : null

  return (
    <div>
      {/* Active Persona Identity Strip */}
      <div className="cg-persona-banner">
        <div className="cg-persona-avatar">{persona.avatarCode}</div>
        <div className="cg-persona-info">
          <div className="row" style={{ gap: 8 }}>
            <strong>You are currently acting as {persona.displayName}</strong>
            <span className="tag">{persona.badge}</span>
            <span className="muted small">· {persona.roleTitle} ({persona.unitOrDept})</span>
          </div>
          <div className="small muted" style={{ marginTop: 2 }}>
            {persona.humanNote}
          </div>
        </div>
        <div className="spacer" />
        {!hasRole && recommendedPersona && (
          <button
            type="button"
            className="btn primary small"
            onClick={() => setPersonaByUsername(recommendedPersona.username)}
          >
            Switch to {recommendedPersona.displayName} ({recommendedPersona.badge}) →
          </button>
        )}
      </div>

      {needRole && !hasRole && (
        <div className="banner info" style={{ marginBottom: 18 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <strong>Observer Mode Notice:</strong> Your current persona (<strong>{persona.displayName}</strong>) does not hold the{' '}
              <span className="tag">{needRole}</span> role. {hint || 'You can still inspect everything on this screen transparently.'}
            </div>
            {recommendedPersona && (
              <button
                type="button"
                className="btn small"
                onClick={() => setPersonaByUsername(recommendedPersona.username)}
              >
                Act as {recommendedPersona.displayName}
              </button>
            )}
          </div>
        </div>
      )}

      {children}
    </div>
  )
}
