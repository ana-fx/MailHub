'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { clearApiKey } from '@/lib/api';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/contacts', label: 'Contacts' },
  { href: '/domains', label: 'Domains' },
] as const;

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {navLinks.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={
              'rounded-lg px-3 py-2 text-sm font-medium transition-colors ' +
              (active
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100')
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col p-4">
      <Link href="/dashboard" onClick={onNavigate} className="px-3 py-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        MailHub
      </Link>
      <div className="mt-4 flex-1">
        <NavItems onNavigate={onNavigate} />
      </div>
      <button
        type="button"
        onClick={clearApiKey}
        className="rounded-lg px-3 py-2 text-left text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        Logout
      </button>
    </div>
  );
}

// AppShell is the layout for authenticated pages: a fixed sidebar on the
// left (a slide-over drawer on mobile) and a scrollable content column with
// a page header.
export function AppShell({ subtitle, children }: { subtitle: string; children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = navLinks.find((l) => l.href === pathname)?.label ?? 'MailHub';

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-black">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-zinc-200 md:block dark:border-zinc-800">
        <div className="sticky top-0 h-screen">
          <SidebarInner />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-20 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-60 border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-black">
            <SidebarInner onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 md:hidden dark:border-zinc-800">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg border border-zinc-300 px-2 py-1 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
          >
            ☰
          </button>
          <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">MailHub</span>
        </div>

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
          <header className="mb-6">
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
