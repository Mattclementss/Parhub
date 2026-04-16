'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const leftItems = [
  {
    href: '/',
    label: 'Home',
    icon: (active: boolean) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'} stroke="currentColor"
        strokeWidth={active ? 0 : 1.75} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M2.25 12L11.204 3.045a1.125 1.125 0 011.591 0L21.75 12M4.5 9.75V19.875c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    href: '/history',
    label: 'Rounds',
    icon: (active: boolean) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'} stroke="currentColor"
        strokeWidth={active ? 0 : 1.75} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
  },
]

const rightItems = [
  {
    href: '/dashboard',
    label: 'Insights',
    icon: (active: boolean) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'} stroke="currentColor"
        strokeWidth={active ? 0 : 1.75} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    badge: true,
    icon: (active: boolean) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'} stroke="currentColor"
        strokeWidth={active ? 0 : 1.75} className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
]

export default function BottomNav({ pendingFriendRequests = 0 }: { pendingFriendRequests?: number }) {
  const pathname = usePathname()
  const logRoundActive = pathname.startsWith('/log-round')

  function NavTab({ item }: { item: typeof leftItems[0] | typeof rightItems[0] }) {
    const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
    const hasBadge = 'badge' in item && item.badge && pendingFriendRequests > 0

    return (
      <Link
        href={item.href}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 h-full"
      >
        <span className={`relative ${active ? 'text-[#4ade80]' : 'text-[#555]'}`}>
          {item.icon(active)}
          {hasBadge && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
              {pendingFriendRequests > 9 ? '9+' : pendingFriendRequests}
            </span>
          )}
        </span>
        <span className={`text-[9px] font-medium ${active ? 'text-[#4ade80]' : 'text-[#555]'}`}>
          {item.label}
        </span>
      </Link>
    )
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#111f13] border-t border-[#2a3d2c] nav-safe-pb">
      <div className="mx-auto max-w-lg flex items-end h-16">
        {leftItems.map((item) => <NavTab key={item.href} item={item} />)}

        {/* Center FAB */}
        <div className="relative w-16 shrink-0 flex flex-col items-center justify-end pb-1.5">
          <Link
            href="/log-round"
            className={`absolute -top-4 flex h-[38px] w-[38px] items-center justify-center rounded-full border-[3px] border-[#0d1a0f] shadow-lg transition-colors ${
              logRoundActive ? 'bg-[#22c55e]' : 'bg-[#4ade80]'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth={2.5} className="w-5 h-5 text-black">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </Link>
          <span className={`text-[9px] font-medium mt-0.5 ${logRoundActive ? 'text-[#4ade80]' : 'text-[#555]'}`}>
            Log
          </span>
        </div>

        {rightItems.map((item) => <NavTab key={item.href} item={item} />)}
      </div>
    </nav>
  )
}
