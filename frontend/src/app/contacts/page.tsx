'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Contact, createContact, deleteContact, getApiKey, listContacts, updateContact } from '@/lib/api';
import { useApiKey } from '@/lib/use-api-key';
import { AppShell } from '@/components/app-shell';

const inputClass =
  'mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100';

const labelClass = 'mt-4 block text-xs font-medium text-zinc-600 dark:text-zinc-300';

// 'new' opens an empty form; a Contact opens the form prefilled for editing.
type Editing = 'new' | Contact | null;

export default function ContactsPage() {
  const router = useRouter();
  const apiKey = useApiKey();
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Editing>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // During hydration the reactive apiKey briefly reads as null (the server
  // snapshot), so the guard re-checks storage directly before redirecting.
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
        // Auth errors clear the key and trigger the redirect effect.
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  async function refresh() {
    try {
      setContacts(await listContacts());
    } catch {
      // Keep the previous list on transient errors.
    }
  }

  function openCreate() {
    setFormError(null);
    setEditing('new');
  }

  function openEdit(contact: Contact) {
    setFormError(null);
    setEditing(contact);
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
      // Auth errors redirect; anything else keeps the list unchanged.
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

  return (
    <AppShell subtitle="Store the people you send email to.">

        <div className="mt-6 flex items-center justify-between gap-3">
          <input
            type="search"
            placeholder="Search contacts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <button
            type="button"
            onClick={openCreate}
            className="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Create a contact
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {contacts === null ? 'Contacts' : `${visible.length} of ${contacts.length} contacts`}
            </h2>
          </div>

          {contacts === null ? (
            <p className="px-5 py-8 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
          ) : visible.length === 0 ? (
            <p className="px-5 py-8 text-sm text-zinc-500 dark:text-zinc-400">
              {contacts.length === 0
                ? 'No contacts yet. Create your first one.'
                : 'No contacts match your search.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Email</th>
                    <th className="px-5 py-3 font-medium">Phone</th>
                    <th className="px-5 py-3 font-medium">Address</th>
                    <th className="px-5 py-3 font-medium">Added</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((contact) => (
                    <tr
                      key={contact.id}
                      className="border-t border-zinc-100 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300"
                    >
                      <td className="px-5 py-3">{contact.name || '—'}</td>
                      <td className="px-5 py-3">{contact.email}</td>
                      <td className="whitespace-nowrap px-5 py-3">{contact.phone || '—'}</td>
                      <td className="max-w-[14rem] truncate px-5 py-3" title={contact.address}>
                        {contact.address || '—'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        {new Date(contact.created_at).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-xs">
                        <button
                          type="button"
                          onClick={() => openEdit(contact)}
                          className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(contact)}
                          className="ml-3 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {editing && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {editing === 'new' ? 'Create a contact' : 'Edit contact'}
              </h2>
              <button
                type="button"
                onClick={() => setEditing(null)}
                aria-label="Close"
                className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                ✕
              </button>
            </div>

            <label className={labelClass} htmlFor="name">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={editing === 'new' ? '' : editing.name}
              className={inputClass}
            />

            <label className={labelClass} htmlFor="email">
              Email <span className="text-red-600 dark:text-red-400">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={editing === 'new' ? '' : editing.email}
              className={inputClass}
            />

            <label className={labelClass} htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={editing === 'new' ? '' : editing.phone}
              className={inputClass}
            />

            <label className={labelClass} htmlFor="address">
              Address
            </label>
            <textarea
              id="address"
              name="address"
              rows={2}
              defaultValue={editing === 'new' ? '' : editing.address}
              className={inputClass}
            />

            {formError && (
              <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                {formError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded-lg px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {saving ? 'Saving…' : editing === 'new' ? 'Create' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
