'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { DEMO_PERSONAS, type DemoPersona } from '@/lib/types'

export type ThemeMode = 'light' | 'dark'

interface ToastMessage {
  title: string
  subtitle: string
  tone?: 'info' | 'crimson' | 'emerald'
}

interface AppContextValue {
  theme: ThemeMode
  toggleTheme: () => void
  setTheme: (t: ThemeMode) => void
  persona: DemoPersona
  setPersonaByUsername: (username: string, silent?: boolean) => void
  toast: ToastMessage | null
  showToast: (t: ToastMessage) => void
  guideOpen: boolean
  setGuideOpen: (open: boolean) => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('light')
  const [persona, setPersonaState] = useState<DemoPersona>(DEMO_PERSONAS[0])
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [guideOpen, setGuideOpen] = useState<boolean>(true)

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('camguard-theme') as ThemeMode | null
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeState(savedTheme)
        document.documentElement.setAttribute('data-theme', savedTheme)
      } else {
        document.documentElement.setAttribute('data-theme', 'light')
      }
      const savedPersona = localStorage.getItem('camguard-persona')
      if (savedPersona) {
        const found = DEMO_PERSONAS.find((p) => p.username === savedPersona)
        if (found) setPersonaState(found)
      }
    } catch {
      document.documentElement.setAttribute('data-theme', 'light')
    }
  }, [])

  const setTheme = (next: ThemeMode) => {
    setThemeState(next)
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem('camguard-theme', next)
    } catch {
      /* ignore */
    }
  }

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }

  const showToast = (msg: ToastMessage) => {
    setToast(msg)
  }

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4200)
    return () => clearTimeout(timer)
  }, [toast])

  const setPersonaByUsername = (username: string, silent = false) => {
    const found = DEMO_PERSONAS.find((p) => p.username === username || p.id === username)
    if (!found) return
    setPersonaState(found)
    try {
      localStorage.setItem('camguard-persona', found.username)
    } catch {
      /* ignore */
    }
    if (!silent) {
      showToast({
        title: `Switched Identity → ${found.displayName} (${found.badge})`,
        subtitle: found.description,
        tone: found.isTechAdmin ? 'crimson' : found.isBoardMember ? 'emerald' : 'info',
      })
    }
  }

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        persona,
        setPersonaByUsername,
        toast,
        showToast,
        guideOpen,
        setGuideOpen,
      }}
    >
      {children}
      {toast && (
        <div className={`cg-toast ${toast.tone || 'info'}`} onClick={() => setToast(null)}>
          <div className="cg-toast-indicator" />
          <div className="cg-toast-body">
            <div className="cg-toast-title">{toast.title}</div>
            <div className="cg-toast-sub">{toast.subtitle}</div>
          </div>
          <button className="cg-toast-close" aria-label="Dismiss">✕</button>
        </div>
      )}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return ctx
}
