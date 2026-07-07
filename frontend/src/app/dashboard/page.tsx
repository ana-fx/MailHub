'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { clearApiKey, sendEmail, SendEmailResponse } from '@/lib/api';
import { useApiKey } from '@/lib/use-api-key';

const inputClass =
  'mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100';

const labelClass = 'mt-4 block text-xs font-medium text-zinc-600 dark:text-zinc-300';

export default function DashboardPage() {
  const router = useRouter();
  const apiKey = useApiKey();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SendEmailResponse | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!apiKey) {
      router.replace('/login');
    }
  }, [apiKey, router]);

  function logout() {
    clearApiKey();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setSending(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await sendEmail({
        to: String(formData.get('to') ?? '').trim(),
        subject: String(formData.get('subject') ?? '').trim(),
        body: String(formData.get('body') ?? '').trim(),
      });
      setResult(response);
      form.reset();
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') {
        // clearApiKey inside api() already triggers the redirect effect.
        return;
      }
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSending(false);
    }
  }

  if (!apiKey) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">MailHub</h1>
          <button
            type="button"
            onClick={logout}
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Logout
          </button>
        </div>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Send an email via your API key.</p>

        <form onSubmit={handleSubmit}>
          <label className={labelClass} htmlFor="to">
            To
          </label>
          <input id="to" name="to" type="email" required className={inputClass} />

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

          {result && (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              Email {result.status} (ID: {result.id})
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
      </div>
    </div>
  );
}
