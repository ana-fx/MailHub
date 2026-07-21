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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const statusVariant: Record<DomainStatus, 'success' | 'destructive' | 'warning'> = {
  verified: 'success',
  failed: 'destructive',
  pending: 'warning',
};

function DkimTable({ records }: { records: DkimRecord[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied((c) => (c === value ? null : c)), 1500);
    } catch {
      // clipboard may be unavailable on non-HTTPS
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="pl-4">Type</TableHead>
            <TableHead>Name / Host</TableHead>
            <TableHead>Value</TableHead>
            <TableHead className="pr-4" />
          </TableRow>
        </TableHeader>
        <TableBody className="font-mono text-xs">
          {records.map((r) => (
            <TableRow key={r.name}>
              <TableCell className="pl-4">{r.type}</TableCell>
              <TableCell className="max-w-[16rem] truncate" title={r.name}>
                {r.name}
              </TableCell>
              <TableCell className="max-w-[16rem] truncate" title={r.value}>
                {r.value}
              </TableCell>
              <TableCell className="pr-4 text-right">
                <Button variant="outline" size="sm" onClick={() => copy(`${r.name}\t${r.value}`)}>
                  {copied === `${r.name}\t${r.value}` ? 'Copied' : 'Copy'}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  async function refresh() {
    try {
      setDomains(await listDomains());
    } catch {
      // keep previous list
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
      // provider errors leave status unchanged
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
      // auth errors redirect; otherwise keep list
    }
  }

  if (!apiKey) {
    return null;
  }

  return (
    <AppShell subtitle="Authenticate your domains to send from your own addresses.">
      <Card>
        <CardContent>
          <form onSubmit={handleAdd} className="flex items-start gap-3">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="yourdomain.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                required
              />
              {error && (
                <p role="alert" className="text-destructive mt-2 text-sm">
                  {error}
                </p>
              )}
            </div>
            <Button type="submit" disabled={adding}>
              {adding ? 'Adding…' : 'Add domain'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-4 flex flex-col gap-4">
        {domains === null ? (
          <p className="text-muted-foreground py-8 text-sm">Loading…</p>
        ) : domains.length === 0 ? (
          <p className="text-muted-foreground py-8 text-sm">
            No domains yet. Add one to send from your own address.
          </p>
        ) : (
          domains.map((d) => (
            <Card key={d.id} className="gap-0 py-0">
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{d.domain}</span>
                  <Badge variant={statusVariant[d.status]}>{d.status}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded((e) => (e === d.id ? null : d.id))}
                  >
                    {expanded === d.id ? 'Hide DNS records' : 'Show DNS records'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleVerify(d.id)}
                    disabled={verifyingId === d.id}
                  >
                    {verifyingId === d.id ? 'Checking…' : 'Verify'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(d)}
                  >
                    Remove
                  </Button>
                </div>
              </div>

              {expanded === d.id && (
                <div className="border-t px-5 py-4">
                  <p className="text-muted-foreground mb-3 text-xs">
                    Add these CNAME records at your DNS provider, then click Verify. DNS changes can
                    take a few minutes to a few hours to propagate.
                  </p>
                  <DkimTable records={d.dkim_records} />
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </AppShell>
  );
}
