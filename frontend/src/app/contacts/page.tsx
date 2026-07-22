'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Contact, createContact, deleteContact, getApiKey, listContacts, updateContact } from '@/lib/api';
import { useApiKey } from '@/lib/use-api-key';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Editing = 'new' | Contact | null;

export default function ContactsPage() {
  const router = useRouter();
  const apiKey = useApiKey();
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Editing>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!apiKey && !getApiKey()) {
      router.replace('/login');
    }
  }, [apiKey, router]);

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    listContacts()
      .then((data) => {
        if (!cancelled) setContacts(data);
      })
      .catch(() => {
        // Settle to an empty list so the UI shows the empty state instead
        // of a stuck "Loading…". Auth errors redirect via the guard.
        if (!cancelled) setContacts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  async function refresh() {
    try {
      setContacts(await listContacts());
    } catch {
      // keep previous list
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setFormError(null);
    setSaving(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get('name') ?? '').trim(),
      email: String(formData.get('email') ?? '').trim(),
      phone: String(formData.get('phone') ?? '').trim(),
      address: String(formData.get('address') ?? '').trim(),
    };

    try {
      if (editing === 'new') {
        await createContact(payload);
      } else {
        await updateContact(editing.id, payload);
      }
      setEditing(null);
      await refresh();
    } catch (err) {
      if (err instanceof Error && err.message === 'UNAUTHORIZED') return;
      setFormError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(contact: Contact) {
    if (!window.confirm(`Delete contact ${contact.email}?`)) return;
    try {
      await deleteContact(contact.id);
      await refresh();
    } catch {
      // auth errors redirect; otherwise keep list
    }
  }

  if (!apiKey) {
    return null;
  }

  const query = search.trim().toLowerCase();
  const visible = (contacts ?? []).filter(
    (c) =>
      !query ||
      c.name.toLowerCase().includes(query) ||
      c.email.toLowerCase().includes(query) ||
      c.phone.toLowerCase().includes(query) ||
      c.address.toLowerCase().includes(query),
  );

  const current = editing === 'new' || editing === null ? null : editing;

  return (
    <AppShell subtitle="Store the people you send email to.">
      <div className="flex items-center justify-between gap-3">
        <Input
          type="search"
          placeholder="Search contacts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button
          onClick={() => {
            setFormError(null);
            setEditing('new');
          }}
        >
          Create a contact
        </Button>
      </div>

      <Card className="mt-4 gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle className="text-base">
            {contacts === null ? 'Contacts' : `${visible.length} of ${contacts.length} contacts`}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {contacts === null ? (
            <p className="text-muted-foreground px-6 py-8 text-sm">Loading…</p>
          ) : visible.length === 0 ? (
            <p className="text-muted-foreground px-6 py-8 text-sm">
              {contacts.length === 0
                ? 'No contacts yet. Create your first one.'
                : 'No contacts match your search.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="pr-6 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell className="pl-6">{contact.name || '—'}</TableCell>
                    <TableCell>{contact.email}</TableCell>
                    <TableCell>{contact.phone || '—'}</TableCell>
                    <TableCell className="max-w-[14rem] truncate" title={contact.address}>
                      {contact.address || '—'}
                    </TableCell>
                    <TableCell>{new Date(contact.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFormError(null);
                          setEditing(contact);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => void handleDelete(contact)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'Create a contact' : 'Edit contact'}</DialogTitle>
          </DialogHeader>
          <form key={current?.id ?? 'new'} onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" type="text" defaultValue={current?.name ?? ''} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input id="email" name="email" type="email" required defaultValue={current?.email ?? ''} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" type="tel" defaultValue={current?.phone ?? ''} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="address">Address</Label>
              <Textarea id="address" name="address" rows={2} defaultValue={current?.address ?? ''} />
            </div>

            {formError && (
              <p role="alert" className="text-destructive text-sm">
                {formError}
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : editing === 'new' ? 'Create' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
