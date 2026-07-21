'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, BarChart3, Globe, Mail, UserPlus } from 'lucide-react';

import {
  Contact,
  EmailLog,
  getApiKey,
  getUserEmail,
  listContacts,
  listDomains,
  listEmails,
  SendingDomain,
  sendEmail,
} from '@/lib/api';
import { useApiKey } from '@/lib/use-api-key';
import { dummyCampaigns } from '@/lib/campaigns';
import { AppShell } from '@/components/app-shell';
import { CreateCampaignDialog } from '@/components/create-campaign-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function greetingName(email: string | null): string {
  if (!email) return 'there';
  const local = email.split('@')[0]?.replace(/[._-]+/g, ' ').trim();
  if (!local) return 'there';
  return local.charAt(0).toUpperCase() + local.slice(1);
}

function daysAgo(iso: string, days: number): boolean {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) && Date.now() - t <= days * 24 * 60 * 60 * 1000;
}

export default function DashboardPage() {
  const router = useRouter();
  const apiKey = useApiKey();
  const [email] = useState<string | null>(() => getUserEmail());
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [logs, setLogs] = useState<EmailLog[] | null>(null);
  const [domains, setDomains] = useState<SendingDomain[] | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!apiKey && !getApiKey()) {
      router.replace('/login');
    }
  }, [apiKey, router]);

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    listContacts().then((d) => !cancelled && setContacts(d)).catch(() => {});
    listEmails().then((d) => !cancelled && setLogs(d)).catch(() => {});
    listDomains().then((d) => !cancelled && setDomains(d)).catch(() => {});
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
      listEmails().then(setLogs).catch(() => {});
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') return;
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSending(false);
    }
  }

  if (!apiKey) {
    return null;
  }

  const totalContacts = contacts?.length ?? null;
  const newContacts = contacts?.filter((c) => daysAgo(c.created_at, 30)).length ?? null;
  const emailsSent = logs?.filter((l) => l.status === 'sent').length ?? null;
  const verifiedDomains = domains?.filter((d) => d.status === 'verified').length ?? null;
  const recentCampaigns = dummyCampaigns.filter((c) => c.status === 'sent').slice(0, 2);

  const stat = (v: number | null) => (v === null ? '—' : v);

  return (
    <AppShell subtitle={`Hello ${greetingName(email)} — here's what's happening.`}>
      {/* Hero / planned for today */}
      <Card className="bg-accent/50">
        <CardHeader>
          <CardTitle>Planned for today</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <CreateCampaignDialog />
            <span className="text-muted-foreground text-sm">Nothing planned for today.</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/contacts"
              className="hover:bg-background/60 flex items-center justify-between rounded-lg border bg-background/40 px-4 py-3 text-sm transition-colors"
            >
              <span className="font-medium">Organize your contacts</span>
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/domains"
              className="hover:bg-background/60 flex items-center justify-between rounded-lg border bg-background/40 px-4 py-3 text-sm transition-colors"
            >
              <span className="font-medium">Authenticate a domain</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: 'Total contacts', value: stat(totalContacts), icon: UserPlus, href: '/contacts' },
          { label: 'Emails sent', value: stat(emailsSent), icon: BarChart3, href: null },
          { label: 'Verified domains', value: stat(verifiedDomains), icon: Globe, href: '/domains' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-semibold">{s.value}</p>
                <p className="text-muted-foreground mt-1 text-sm">{s.label}</p>
                {s.label === 'Total contacts' && newContacts !== null && (
                  <p className="text-muted-foreground text-xs">+{newContacts} in the last 30 days</p>
                )}
              </div>
              <div className="bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-lg">
                <s.icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Last campaigns (dummy) */}
      <Card className="mt-6 gap-0 py-0">
        <CardHeader className="flex flex-row items-center justify-between border-b py-4">
          <CardTitle className="text-base">Your last campaigns</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/campaigns">Go to Campaigns</Link>
          </Button>
        </CardHeader>
        <CardContent className="divide-y p-0">
          {recentCampaigns.map((c) => (
            <div key={c.id} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-muted-foreground text-sm">
                  #{c.id} · Sent on {new Date(c.sentAt!).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="success">Sent</Badge>
                <Badge variant="secondary">{c.channel}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Send a transactional email (real) */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="size-4" /> Send an email
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="to">To</Label>
              <Input id="to" name="to" type="email" required list="contact-emails" />
              <datalist id="contact-emails">
                {(contacts ?? []).map((c) => (
                  <option key={c.id} value={c.email}>
                    {c.name}
                  </option>
                ))}
              </datalist>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" name="subject" type="text" required />
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label htmlFor="body">Body</Label>
              <Textarea id="body" name="body" rows={4} required />
            </div>
            {error && (
              <p role="alert" className="text-destructive text-sm sm:col-span-2">
                {error}
              </p>
            )}
            {notice && (
              <p className="text-sm text-emerald-600 sm:col-span-2 dark:text-emerald-400">{notice}</p>
            )}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={sending}>
                {sending ? 'Sending…' : 'Send email'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}
