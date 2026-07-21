'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Contact, EmailLog, EmailStatus, getApiKey, listContacts, listEmails, sendEmail } from '@/lib/api';
import { useApiKey } from '@/lib/use-api-key';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const statusVariant: Record<EmailStatus, 'success' | 'destructive' | 'warning'> = {
  sent: 'success',
  failed: 'destructive',
  pending: 'warning',
};

export default function DashboardPage() {
  const router = useRouter();
  const apiKey = useApiKey();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [logs, setLogs] = useState<EmailLog[] | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    if (!apiKey && !getApiKey()) {
      router.replace('/login');
    }
  }, [apiKey, router]);

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    listEmails()
      .then((data) => {
        if (!cancelled) setLogs(data);
      })
      .catch(() => {});
    listContacts()
      .then((data) => {
        if (!cancelled) setContacts(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  async function refreshLogs() {
    try {
      setLogs(await listEmails());
    } catch {
      // keep previous list
    }
  }

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
      if (err instanceof Error && err.message === 'UNAUTHORIZED') return;
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
    <AppShell subtitle="Send email and track recent deliveries.">
      <div className="grid gap-4 sm:grid-cols-3">
        {(['sent', 'failed', 'pending'] as const).map((status) => (
          <Card key={status}>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                {status}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{logs === null ? '—' : counts[status]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Send an email</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="to">To</Label>
                <Input id="to" name="to" type="email" required list="contact-emails" />
                <datalist id="contact-emails">
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.email}>
                      {contact.name}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" name="subject" type="text" required />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="body">Body</Label>
                <Textarea id="body" name="body" rows={5} required />
              </div>

              {error && (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              )}
              {notice && <p className="text-sm text-emerald-600 dark:text-emerald-400">{notice}</p>}

              <Button type="submit" disabled={sending} className="w-full">
                {sending ? 'Sending…' : 'Send email'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="gap-0 py-0">
          <CardHeader className="flex flex-row items-center justify-between border-b py-4">
            <CardTitle className="text-base">Recent emails</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => void refreshLogs()}>
              Refresh
            </Button>
          </CardHeader>
          <CardContent className="px-0">
            {logs === null ? (
              <p className="text-muted-foreground px-6 py-8 text-sm">Loading…</p>
            ) : logs.length === 0 ? (
              <p className="text-muted-foreground px-6 py-8 text-sm">
                No emails yet. Send your first one from the form.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Retries</TableHead>
                    <TableHead>Sent at</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="pl-6">{log.recipient}</TableCell>
                      <TableCell className="max-w-[16rem] truncate" title={log.subject}>
                        {log.subject}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[log.status]} title={log.error || undefined}>
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.retry_count}</TableCell>
                      <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
