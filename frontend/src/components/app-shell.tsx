'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Globe, LogOut, Menu, Mail } from 'lucide-react';

import { clearApiKey } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/domains', label: 'Domains', icon: Globe },
] as const;

function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex items-center gap-2 px-3 py-2 text-lg font-semibold"
      >
        <Mail className="size-5" />
        MailHub
      </Link>

      <nav className="mt-2 flex flex-1 flex-col gap-1">
        {navLinks.map((link) => {
          const active = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              )}
            >
              <Icon className="size-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      <Button
        variant="ghost"
        onClick={clearApiKey}
        className="justify-start text-sidebar-foreground/70"
      >
        <LogOut className="size-4" />
        Logout
      </Button>
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
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="bg-sidebar border-sidebar-border hidden w-60 shrink-0 border-r md:block">
        <div className="sticky top-0 h-screen">
          <SidebarInner />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="bg-sidebar border-sidebar-border absolute top-0 left-0 h-full w-60 border-r">
            <SidebarInner onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b px-4 py-3 md:hidden">
          <Button variant="outline" size="icon" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
            <Menu />
          </Button>
          <span className="text-base font-semibold">MailHub</span>
        </div>

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
          <header className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
