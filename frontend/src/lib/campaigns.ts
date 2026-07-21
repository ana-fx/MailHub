// Dummy campaign data. Campaigns are a UI preview only for now — there is
// no backend behind them yet. Kept here so the dashboard and the campaigns
// page share the same sample set.

export type CampaignStatus = 'sent' | 'draft' | 'scheduled';

export interface Campaign {
  id: number;
  name: string;
  status: CampaignStatus;
  channel: 'Email';
  sentAt: string | null;
  recipients: number;
  openRate: number | null;
}

export const dummyCampaigns: Campaign[] = [
  {
    id: 7,
    name: 'asdasd',
    status: 'sent',
    channel: 'Email',
    sentAt: '2026-02-08T15:04:00Z',
    recipients: 5,
    openRate: 0.42,
  },
  {
    id: 5,
    name: 'Test Campaign',
    status: 'sent',
    channel: 'Email',
    sentAt: '2025-12-12T11:15:00Z',
    recipients: 3,
    openRate: 0.33,
  },
  {
    id: 8,
    name: 'February Newsletter',
    status: 'draft',
    channel: 'Email',
    sentAt: null,
    recipients: 0,
    openRate: null,
  },
];
