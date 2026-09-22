import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { OnboardingGate } from '../components/OnboardingGate'
import { StepCounterProvider } from '../context/StepCounterContext'
import './globals.css'

export const metadata: Metadata = {
  title: 'MOVEGRID — Move & Play',
  description: 'A playful movement game where every walk, challenge, and checkpoint becomes progress.',
  generator: 'MOVEGRID',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f5f7f4',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background">
      <body className="antialiased">
        <Suspense
          fallback={
            <div className="app-shell fitness-loading">
              <p>Loading…</p>
            </div>
          }
        >
          <OnboardingGate>
            <StepCounterProvider>{children}</StepCounterProvider>
          </OnboardingGate>
        </Suspense>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
