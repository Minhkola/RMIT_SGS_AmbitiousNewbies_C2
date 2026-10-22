'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTideCloak } from '@tidecloak/nextjs'
import { useAppContext } from '@/app/components/AppContext'
import { DEMO_PERSONAS } from '@/lib/types'

export default function Nav() {
  const { authenticated, logout, getValueFromIdToken } = useTideCloak()
  const { theme, toggleTheme, persona, setPersonaByUsername, guideOpen, setGuideOpen } = useAppContext()
  const path = usePathname()
  const router = useRouter()

  const ssoName = authenticated ? getValueFromIdToken('preferred_username') : null

  const links = [
    { href: '/', code: '00', label: 'Mandate Overview' },
    { href: '/assistant', code: '01', label: 'AI Concierge' },
    { href: '/request', code: '02', label: 'Request Footage' },
    { href: '/board', code: '03', label: 'Board Quorum (2/3)' },
    { href: '/ingest', code: '04', label: 'Encrypted Vault' },
    { href: '/audit', code: '05', label: 'Public Ledger' },
  ]

  const runGuidedStep = (step: 1 | 2 | 3 | 4) => {
    if (step === 1) {
      setPersonaByUsername('maya.lin')
      router.push('/assistant')
    } else if (step === 2) {
      setPersonaByUsername('maya.lin')
      router.push('/assistant?scenario=injection')
    } else if (step === 3) {
      setPersonaByUsername('victor.k')
      router.push('/ingest')
    } else if (step === 4) {
      setPersonaByUsername('elena.rostova')
      router.push('/board')
    }
  }

  return (
    <header className="cg-header-shell">
      {/* Top Poster Mandate Protocol Bar */}
      <div className="cg-mandate-strip">
        <div className="cg-mandate-coords">
          <span>N1</span>
          <span>N2</span>
          <span>N3</span>
          <span>N4</span>
          <span className="cg-mandate-red-block" />
          <span>N5</span>
        </div>
        <div className="cg-mandate-copy">
          <span>
            IF YOU WITNESS SUSPICIOUS ACTIVITY, QUERY THE AI CONCIERGE OR FILE A PUBLIC BOARD REQUEST. NO SINGLE ADMIN OR AI HOLDS DECRYPTION KEYS.
          </span>
          <strong>STAY ALERT. STAY SAFE. FOLLOW PROTOCOL.</strong>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <nav className="nav">
        <Link href="/" className="brand">
          <span className="brand-square" />
          <div className="brand-text">
            <span className="brand-title">CAMGUARD</span>
            <span className="brand-sub">TIDECLOAK // QUORUM CCTV</span>
          </div>
        </Link>

        <div className="links">
          {links.map((l) => {
            const isActive = path === l.href || (l.href !== '/' && path?.startsWith(l.href))
            return (
              <Link key={l.href} href={l.href} className={isActive ? 'active' : ''}>
                <span className="nav-code">{l.code}</span>
                <span>{l.label}</span>
              </Link>
            )
          })}
        </div>

        <div className="spacer" />

        <div className="nav-controls">
          {/* Interactive Persona Selector */}
          <div className="persona-switcher" title="Switch active role to test different perspectives">
            <span className="persona-label">ACTING AS:</span>
            <select
              aria-label="Select Active Demo Persona"
              value={persona.username}
              onChange={(e) => setPersonaByUsername(e.target.value)}
              className="persona-select"
            >
              {DEMO_PERSONAS.map((p) => (
                <option key={p.username} value={p.username}>
                  [{p.badge}] {p.displayName} — {p.roleTitle}
                </option>
              ))}
            </select>
          </div>

          {/* Guide Toggle */}
          <button
            type="button"
            className={`btn small ${guideOpen ? 'active-guide' : 'ghost'}`}
            onClick={() => setGuideOpen(!guideOpen)}
            title="Toggle Interactive 4-Step Walkthrough Bar"
          >
            {guideOpen ? '▾ Hide Guide' : '▸ Demo Guide'}
          </button>

          {/* Theme Toggle (Light Paper ⇄ Dark Obsidian) */}
          <button
            type="button"
            className="btn small theme-toggle-btn"
            onClick={toggleTheme}
            title="Switch between Tactical Paper (Light) and Obsidian Command (Dark)"
          >
            {theme === 'light' ? '☾ DARK MODE' : '☀ LIGHT MODE'}
          </button>

          {authenticated && ssoName && (
            <button className="btn ghost small" onClick={() => logout()}>
              SSO: {ssoName} (Sign Out)
            </button>
          )}
        </div>
      </nav>

      {/* Interactive 4-Step Story Walkthrough Bar */}
      {guideOpen && (
        <div className="cg-storybar">
          <div className="cg-storybar-inner">
            <div className="cg-storybar-intro">
              <span className="cg-badge-red">INTERACTIVE STORY</span>
              <span>Click any step to experience how CamGuard eliminates the trust bottleneck:</span>
            </div>
            <div className="cg-story-steps">
              <button type="button" className="cg-step-btn" onClick={() => runGuidedStep(1)}>
                <span className="step-num">①</span>
                <div>
                  <strong>Ask Everyday Questions</strong>
                  <small>AI answers safely from sensor counts</small>
                </div>
              </button>
              <button type="button" className="cg-step-btn danger" onClick={() => runGuidedStep(2)}>
                <span className="step-num">②</span>
                <div>
                  <strong>Try Prompt Injection</strong>
                  <small>“I’m Police!” → AI tricked, Vault blocks</small>
                </div>
              </button>
              <button type="button" className="cg-step-btn warn" onClick={() => runGuidedStep(3)}>
                <span className="step-num">③</span>
                <div>
                  <strong>Rogue IT Admin Test</strong>
                  <small>Admin tries self-grant → Frozen at 0/2</small>
                </div>
              </button>
              <button type="button" className="cg-step-btn ok" onClick={() => runGuidedStep(4)}>
                <span className="step-num">④</span>
                <div>
                  <strong>2/3 Board Quorum</strong>
                  <small>Elena + David co-sign → Video unlocks</small>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
