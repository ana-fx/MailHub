import { getApiKey, setApiKey } from '@/lib/api';
import { redirect } from 'next/navigation';

export default function LoginPage() {
  async function login(formData: FormData) {
    'use server';
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8080'}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(data.error || 'Login failed');
    }

    const data = await res.json();
    if (!data.apiKey) {
      throw new Error('Invalid response');
    }

    setApiKey(data.apiKey);
    redirect('/dashboard');
  }

  if (getApiKey()) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
      <form
        action={login}
        className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">MailHub</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Sign in to continue.</p>

        <label className="mt-5 block text-xs font-medium text-zinc-600 dark:text-zinc-300" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />

        <label className="mt-4 block text-xs font-medium text-zinc-600 dark:text-zinc-300" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />

        <button
          type="submit"
          className="mt-5 w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Login
        </button>
      </form>
    </div>
  );
}
