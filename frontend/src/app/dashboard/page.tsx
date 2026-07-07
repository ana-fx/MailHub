'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Contact, EmailLog, EmailStatus, getApiKey, listContacts, listEmails, sendEmail } from '@/lib/api';
import { useApiKey } from '@/lib/use-api-key';
import { AppHeader } from '@/components/app-header';

const inputClass =
  'mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100';

const labelClass = 'mt-4 block text-xs font-medium text-zinc-600 dark:text-zinc-300';

const statusBadgeClass: Record<EmailStatus, string> = {
  sent: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  failed: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};

export default function DashboardPage() {
  const router = useRouter();
  const apiKey = useApiKey();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<EmailLog[] | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);

  // During hydration the reactive apiKey briefly reads as null (the server
  // snapshot), so the guard re-checks storage directly before redirecting.
  useEffect(() => {
    if (!apiKey && !getApiKey()) {
      router.replace('/login');
    }
  }, [apiKey, router]);

  const refreshLogs = useCallback(async () => {
    try {
      setLogs(await listEmails());
    } catch {
      // Auth errors clear the key and trigger the redirect effect;
      // anything else just leaves the previous list in place.
    }
  }, []);

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    listEmails()
      .then((data) => {
        if (!cancelled) setLogs(data);
      })
      .catch(() => {
        // Auth errors clear the key and trigger the redirect effect.
      });
    listContacts()
      .then((data) => {
        if (!cancelled) setContacts(data);
      })
      .catch(() => {
        // The datalist is a nice-to-have; ignore load failures.
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSending(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await sendEmail({
        to: String(formData.get('to') ?? '').trim(),
        subject: String(formData.get('subject') ?? '').trim(),
        body: String(formData.get('body') ?? '').trim(),
      });
      setNotice(`Email ${response.status} (ID: ${response.id})`);
      form.reset();
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        // clearApiKey inside api() already triggers the redirect effect.
        return;
      }
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSending(false);
      void refreshLogs();
    }
  }

  if (!apiKey) {
    return null;
  }

  const counts = { sent: 0, failed: 0, pending: 0 };
  for (const log of logs ?? []) {
    counts[log.status] += 1;
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-10 dark:bg-black">
      <div className="mx-auto w-full max-w-4xl">
        <AppHeader subtitle="Send email and track recent deliveries." />

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {(['sent', 'failed', 'pending'] as const).map((status) => (
            <div
              key={status}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {status}
              </p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {logs === null ? '—' : counts[status]}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Send an email</h2>

            <label className={labelClass} htmlFor="to">
              To
            </label>
            <input id="to" name="to" type="email" required list="contact-emails" className={inputClass} />
            <datalist id="contact-emails">
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.email}>
                  {contact.name}
                </option>
              ))}
            </datalist>

            <label className={labelClass} htmlFor="subject">
              Subject
            </label>
            <input id="subject" name="subject" type="text" required className={inputClass} />

            <label className={labelClass} htmlFor="body">
              Body
            </label>
            <textarea id="body" name="body" rows={5} required className={inputClass} />

            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {error}
              </p>
            )}

            {notice && (
              <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                {notice}
              </p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="mt-5 w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {sending ? 'Sending…' : 'Send email'}
            </button>
          </form>

          <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recent emails</h2>
              <button
                type="button"
                onClick={() => void refreshLogs()}
                className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Refresh
              </button>
            </div>

            {logs === null ? (
              <p className="px-5 py-8 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
            ) : logs.length === 0 ? (
              <p className="px-5 py-8 text-sm text-zinc-500 dark:text-zinc-400">
                No emails yet. Send your first one from the form.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      <th className="px-5 py-3 font-medium">Recipient</th>
                      <th className="px-5 py-3 font-medium">Subject</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Retries</th>
                      <th className="px-5 py-3 font-medium">Sent at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-t border-zinc-100 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
                      >
                        <td className="px-5 py-3">{log.recipient}</td>
                        <td className="max-w-[16rem] truncate px-5 py-3" title={log.subject}>
                          {log.subject}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass[log.status]}`}
                            title={log.error || undefined}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="px-5 py-3">{log.retry_count}</td>
                        <td className="whitespace-nowrap px-5 py-3">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
