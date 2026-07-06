import { getApiKey, setApiKey } from '@/lib/api';
import { redirect } from 'next/navigation';

export default function Home() {
  async function login(formData: FormData) {
    'use server';
    const key = String(formData.get('apiKey') ?? '').trim();
    if (!key) {
      throw new Error('API key is required');
    }
    setApiKey(key);
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
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Enter your API key to continue.</p>

        <label className="mt-5 block text-xs font-medium text-zinc-600 dark:text-zinc-300" htmlFor="apiKey">
          API Key
        </label>
        <input
          id="apiKey"
          name="apiKey"
          type="password"
          required
          placeholder="mh_sk_..."
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
