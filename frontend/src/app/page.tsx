'use client';

import Link from 'next/link';
import { Mail } from 'lucide-react';

import { useApiKey } from '@/lib/use-api-key';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2 text-lg font-semibold">
          <Mail className="size-5" />
          MailHub
        </span>
        <Button asChild variant="outline" size="sm">
          <Link href={ctaHref}>{apiKey ? 'Dashboard' : 'Sign in'}</Link>
        </Button>
      </header>

      <main className="mx-auto w-full max-w-4xl px-6 pb-24">
        <section className="pt-16 text-center sm:pt-24">
          <h1 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Transactional email for your apps, one API call away
          </h1>
          <p className="text-muted-foreground mx-auto mt-5 max-w-xl text-lg leading-8">
            MailHub is a standalone email-sending service. Your projects call a single REST endpoint
            with an API key; MailHub delivers through AWS SES, logs every message, and retries
            failures automatically.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href={ctaHref}>{ctaLabel}</Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <a href="#how-it-works">How it works</a>
            </Button>
          </div>
        </section>

        <section id="how-it-works" className="mt-20 scroll-mt-8">
          <div className="overflow-x-auto rounded-xl border bg-zinc-950 p-5 text-left">
            <pre className="text-xs leading-6 text-zinc-100 sm:text-sm">
              <code>{curlExample}</code>
            </pre>
          </div>
          <p className="text-muted-foreground mt-3 text-center text-sm">
            Register to get an API key, then send your first email in minutes.
          </p>
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <CardTitle className="text-sm">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-6">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </main>

      <footer className="text-muted-foreground border-t py-6 text-center text-xs">
        MailHub — Go · PostgreSQL · AWS SES
      </footer>
    </div>
  );
}
