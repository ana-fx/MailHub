'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { clearApiKey } from '@/lib/api';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/contacts', label: 'Contacts' },
] as const;

// Shared header for authenticated pages: title, section nav, and logout.
// Logout only clears the stored key — each page's auth guard handles the
// redirect to /login.
export function AppHeader({ subtitle }: { subtitle: string }) {
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">MailHub</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      </div>
      <nav className="flex items-center gap-4 text-xs">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              pathname === link.href
                ? 'font-semibold text-zinc-900 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }
          >
            {link.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={clearApiKey}
          className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Logout
        </button>
      </nav>
    </div>
  );
}
