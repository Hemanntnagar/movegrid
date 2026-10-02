'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Gift, LayoutDashboard, Target, Trophy } from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Home', href: '/', Icon: LayoutDashboard, mobileHidden: true },
  { label: 'Challenges', href: '/challenges', Icon: Target, shortLabel: 'Quests' },
  { label: 'Competitions', href: '/competitions', Icon: Trophy, shortLabel: 'Cups' },
  { label: 'Rewards', href: '/rewards', Icon: Gift, shortLabel: 'Store' },
] as const

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <footer className="centered-nav-bar mobile-tab-bar">
      {NAV_ITEMS.map(({ label, href, Icon, mobileHidden, shortLabel }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return (
          <Link
            className={[active ? 'active' : '', mobileHidden ? 'nav-home-link' : ''].filter(Boolean).join(' ')}
            href={href}
            key={href}
            aria-label={label}
            title={label}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 2} />
            <span className="nav-bar-label">{shortLabel ?? label}</span>
          </Link>
        )
      })}
    </footer>
  )
}
