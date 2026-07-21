'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { getApiKey } from '@/lib/api';
import { useApiKey } from '@/lib/use-api-key';
import { Campaign, CampaignStatus, dummyCampaigns } from '@/lib/campaigns';
import { AppShell } from '@/components/app-shell';
import { CreateCampaignDialog } from '@/components/create-campaign-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const statusVariant: Record<CampaignStatus, 'success' | 'secondary' | 'warning'> = {
  sent: 'success',
  draft: 'secondary',
  scheduled: 'warning',
};

function formatSent(c: Campaign): string {
  if (!c.sentAt) return '—';
  return new Date(c.sentAt).toLocaleDateString();
}

export default function CampaignsPage() {
  const router = useRouter();
  const apiKey = useApiKey();

  useEffect(() => {
    if (!apiKey && !getApiKey()) {
      router.replace('/login');
    }
  }, [apiKey, router]);

  if (!apiKey) {
    return null;
  }

  return (
    <AppShell subtitle="Build and track your email campaigns.">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          <Badge variant="secondary" className="mr-2">
            Preview
          </Badge>
          Campaigns are a preview — the data below is sample data.
        </p>
        <CreateCampaignDialog />
      </div>

      <Card className="mt-4 gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle className="text-base">All campaigns</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead className="pr-6">Open rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dummyCampaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="pl-6 font-medium">{c.name}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[c.status]}>{c.status}</Badge>
                  </TableCell>
                  <TableCell>{c.channel}</TableCell>
                  <TableCell>{formatSent(c)}</TableCell>
                  <TableCell>{c.recipients || '—'}</TableCell>
                  <TableCell className="pr-6">
                    {c.openRate === null ? '—' : `${Math.round(c.openRate * 100)}%`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppShell>
  );
}
