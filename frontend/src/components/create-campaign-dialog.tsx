'use client';

import { Megaphone } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// Campaigns are a UI preview for now — this dialog explains that instead of
// starting a real campaign flow.
export function CreateCampaignDialog({
  variant = 'default',
  className,
  label = 'Create campaign',
}: {
  variant?: 'default' | 'outline' | 'secondary';
  className?: string;
  label?: string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={variant} className={className}>
          <Megaphone />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Campaigns are coming soon</DialogTitle>
          <DialogDescription>
            The campaigns area is a preview. Building, scheduling, and sending marketing campaigns
            isn&apos;t wired up yet — for now you can send transactional email from the dashboard and
            manage your contacts and domains.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
