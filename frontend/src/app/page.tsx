'use client';

import Link from 'next/link';

import { useApiKey } from '@/lib/use-api-key';

const features = [
  {
    title: 'REST API + API Key',
    description:
      'One simple endpoint. Authenticate with an X-API-Key header and send email from any stack — Laravel, Next.js, or plain curl.',
  },
  {
    title: 'Delivered via AWS SES',
    description:
      'Every message goes out through Amazon SES using your verified domain, so deliverability and reputation stay in your control.',
  },
  {
    title: 'Delivery logs in PostgreSQL',
    description:
      'Each send is recorded with its status — pending, sent, or failed — along with the provider message ID and any error details.',
  },
  {
    title: 'Automatic retries',
    description:
      'Transient failures are retried with exponential backoff before a message is marked failed, so blips do not lose email.',
  },
];

const curlExample = `curl -X POST https://api.example.com/api/v1/emails \\
  -H "X-API-Key: mh_sk_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "recipient@example.com",
    "subject": "Invoice #1234",
    "body": "<p>Your invoice is ready.</p>"
  }'`;

export default function Home() {
  const apiKey = useApiKey();
  const ctaHref = apiKey ? '/dashboard' : '/login';
  const ctaLabel = apiKey ? 'Open dashboard' : 'Get your API key';

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-100">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-5">
        <span className="text-lg font-semibold">MailHub</span>
        <Link
          href={ctaHref}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          {apiKey ? 'Dashboard' : 'Sign in'}
        </Link>
      </header>

      <main className="mx-auto w-full max-w-4xl px-6 pb-24">
        <section className="pt-16 text-center sm:pt-24">
          <h1 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Transactional email for your apps, one API call away
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            MailHub is a standalone email-sending service. Your projects call a single REST endpoint
            with an API key; MailHub delivers through AWS SES, logs every message, and retries
            failures automatically.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href={ctaHref}
              className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {ctaLabel}
            </Link>
            <a
              href="#how-it-works"
              className="rounded-lg px-5 py-2.5 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              How it works
            </a>
          </div>
        </section>

        <section id="how-it-works" className="mt-20 scroll-mt-8">
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-900 p-5 text-left dark:border-zinc-800">
            <pre className="text-xs leading-6 text-zinc-100 sm:text-sm">
              <code>{curlExample}</code>
            </pre>
          </div>
          <p className="mt-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Register to get an API key, then send your first email in minutes.
          </p>
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h2 className="text-sm font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                {feature.description}
              </p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
        MailHub — Go · PostgreSQL · AWS SES
      </footer>
    </div>
  );
}
