import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { TideCloakProvider } from '@tidecloak/nextjs'
import tcConfig from '@/tidecloak.json'
import { AppProvider } from '@/app/components/AppContext'
import Nav from '@/app/components/Nav'
import './globals.css'

export const metadata: Metadata = {
  title: 'CAMGUARD // AI Building Concierge Without a Trust Bottleneck',
  description:
    'An apartment CCTV AI concierge that answers everyday questions from anonymous sensors, yet is mathematically incapable of viewing or leaking raw video without a 2/3 Building Board quorum — enforced by TideCloak.',
}

const clientConfig = {
  ...tcConfig,
  useDPoP: false,
  checkLoginIframe: false,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <TideCloakProvider config={clientConfig as any}>
          <AppProvider>
            <div className="cg-crosshair-bg" aria-hidden="true" />
            <Nav />
            <main className="container">{children}</main>
          </AppProvider>
        </TideCloakProvider>
      </body>
    </html>
  )
}
