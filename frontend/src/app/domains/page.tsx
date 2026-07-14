'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  createDomain,
  deleteDomain,
  DkimRecord,
  DomainStatus,
  getApiKey,
  listDomains,
  SendingDomain,
  verifyDomain,
} from '@/lib/api';
import { useApiKey } from '@/lib/use-api-key';
import { AppShell } from '@/components/app-shell';

const statusBadgeClass: Record<DomainStatus, string> = {
  verified: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  failed: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};

function DkimTable({ records }: { records: DkimRecord[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied((c) => (c === value ? null : c)), 1500);
    } catch {
      // Clipboard may be unavailable (e.g. non-HTTPS); the value is still
      // selectable in the cell.
    }
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="bg-zinc-50 text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
            <th className="px-3 py-2 font-medium">Type</th>
            <th className="px-3 py-2 font-medium">Name / Host</th>
            <th className="px-3 py-2 font-medium">Value</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody className="font-mono">
          {records.map((r) => (
            <tr key={r.name} className="border-t border-zinc-100 dark:border-zinc-800">
              <td className="px-3 py-2">{r.type}</td>
              <td className="max-w-[16rem] truncate px-3 py-2" title={r.name}>
                {r.name}
              </td>
              <td className="max-w-[16rem] truncate px-3 py-2" title={r.value}>
                {r.value}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-right">
                <button
                  type="button"
                  onClick={() => copy(`${r.name}\t${r.value}`)}
                  className="rounded border border-zinc-300 px-2 py-1 font-sans text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {copied === `${r.name}\t${r.value}` ? 'Copied' : 'Copy'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DomainsPage() {
  const router = useRouter();
  const apiKey = useApiKey();
  const [domains, setDomains] = useState<SendingDomain[] | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey && !getApiKey()) {
      router.replace('/login');
    }
  }, [apiKey, router]);

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    listDomains()
      .then((data) => {
        if (!cancelled) setDomains(data);
      })
      .catch(() => {
        // Auth errors clear the key and trigger the redirect effect.
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  async function refresh() {
    try {
      setDomains(await listDomains());
    } catch {
      // Keep the previous list on transient errors.
    }
  }

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setAdding(true);
    try {
      const created = await createDomain(newDomain);
      setNewDomain('');
      setExpanded(created.id);
      await refresh();
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') return;
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setAdding(false);
    }
  }

  async function handleVerify(id: string) {
    setVerifyingId(id);
    try {
      const updated = await verifyDomain(id);
      setDomains((prev) => (prev ? prev.map((d) => (d.id === id ? updated : d)) : prev));
    } catch {
      // Provider errors leave status unchanged.
    } finally {
      setVerifyingId(null);
    }
  }

  async function handleDelete(d: SendingDomain) {
    if (!window.confirm(`Remove domain ${d.domain}?`)) return;
    try {
      await deleteDomain(d.id);
      await refresh();
    } catch {
      // Auth errors redirect; anything else keeps the list.
    }
  }

  if (!apiKey) {
    return null;
  }

  return (
    <AppShell subtitle="Authenticate your domains to send from your own addresses.">

        <form
          onSubmit={handleAdd}
          className="mt-6 flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="flex-1">
            <input
              type="text"
              placeholder="yourdomain.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
            {error && (
              <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={adding}
            className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {adding ? 'Adding…' : 'Add domain'}
          </button>
        </form>

        <div className="mt-4 space-y-4">
          {domains === null ? (
            <p className="px-1 py-8 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
          ) : domains.length === 0 ? (
            <p className="px-1 py-8 text-sm text-zinc-500 dark:text-zinc-400">
              No domains yet. Add one to send from your own address.
            </p>
          ) : (
            domains.map((d) => (
              <div
                key={d.id}
                className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-center justify-between gap-3 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{d.domain}</span>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass[d.status]}`}
                    >
                      {d.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setExpanded((e) => (e === d.id ? null : d.id))}
                      className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                    >
                      {expanded === d.id ? 'Hide DNS records' : 'Show DNS records'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVerify(d.id)}
                      disabled={verifyingId === d.id}
                      className="rounded-lg border border-zinc-300 px-3 py-1 font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      {verifyingId === d.id ? 'Checking…' : 'Verify'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(d)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {expanded === d.id && (
                  <div className="border-t border-zinc-100 px-5 py-4 dark:border-zinc-800">
                    <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                      Add these CNAME records at your DNS provider, then click Verify. DNS changes can
                      take a few minutes to a few hours to propagate.
                    </p>
                    <DkimTable records={d.dkim_records} />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
    </AppShell>
  );
}
