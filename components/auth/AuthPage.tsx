import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import Button from '../Button';
import { isSupabaseConfigured, sendMagicLink, signInWithGoogle } from '../../services/supabase';

interface AuthPageProps {
  onContinueGuest: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onContinueGuest }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState<'email' | 'google' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading('email');
    setError(null);
    setMessage(null);
    try {
      await sendMagicLink(email.trim());
      setMessage('Check your inbox. The sign-in link will return you to Nano Curator.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send the sign-in link.');
    } finally {
      setLoading(null);
    }
  };

  const handleGoogle = async () => {
    setLoading('google');
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start Google sign-in.');
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto grid min-h-[72vh] w-full max-w-5xl place-items-center px-4 pb-16 sm:px-6">
      <div className="grid w-full overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-[0_30px_90px_-55px_rgba(28,25,23,0.55)] lg:grid-cols-[1fr_0.8fr]">
        <section className="p-7 sm:p-10">
          <button type="button" onClick={onContinueGuest} className="mb-10 inline-flex items-center gap-2 text-sm font-medium text-stone-500 transition hover:text-stone-900"><ArrowLeft className="h-4 w-4" />Back to guest mode</button>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Your account</p>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-950">Save your style across sessions</h1>
          <p className="mt-3 max-w-lg text-sm leading-6 text-stone-500">Use a password-free email link or your Google account. Guest mode remains available for quick demos.</p>

          {!isSupabaseConfigured && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Authentication is scaffolded but not connected. Add <code className="rounded bg-white px-1.5 py-0.5">VITE_SUPABASE_URL</code> and <code className="rounded bg-white px-1.5 py-0.5">VITE_SUPABASE_PUBLISHABLE_KEY</code> to <code className="rounded bg-white px-1.5 py-0.5">.env.local</code>.
            </div>
          )}

          <button type="button" disabled={!isSupabaseConfigured || loading !== null} onClick={handleGoogle} className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-800 transition hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-base font-bold text-blue-600">G</span>
            {loading === 'google' ? 'Opening Google...' : 'Continue with Google'}
          </button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-stone-400"><span className="h-px flex-1 bg-stone-200" />or email<span className="h-px flex-1 bg-stone-200" /></div>

          <form onSubmit={handleEmail} className="space-y-3">
            <label className="block space-y-2">
              <span className="flex items-center gap-2 text-sm font-medium text-stone-700"><Mail className="h-4 w-4" />Email address</span>
              <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" disabled={!isSupabaseConfigured} className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:bg-stone-100" />
            </label>
            <Button type="submit" disabled={!isSupabaseConfigured || !email.trim()} isLoading={loading === 'email'} loadingLabel="Sending link" className="w-full">Email me a sign-in link</Button>
          </form>

          {message && <div className="mt-5 flex gap-2 rounded-xl bg-teal-50 p-3 text-sm text-teal-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{message}</div>}
          {error && <div className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </section>

        <aside className="bg-stone-950 p-7 text-white sm:p-10">
          <ShieldCheck className="h-7 w-7 text-teal-300" />
          <h2 className="mt-8 text-2xl font-semibold">What this layer does</h2>
          <ol className="mt-6 space-y-5 text-sm leading-6 text-stone-300">
            <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs text-teal-200">1</span><span>Supabase verifies the email or Google identity.</span></li>
            <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs text-teal-200">2</span><span>The browser receives a short-lived access token and refresh session.</span></li>
            <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs text-teal-200">3</span><span>The stable user ID will own profile, wardrobe, and session rows in the database.</span></li>
          </ol>
          <div className="mt-10 flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-5 text-stone-300"><KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />AI-provider API keys remain separate and are never stored in Supabase.</div>
        </aside>
      </div>
    </div>
  );
};
