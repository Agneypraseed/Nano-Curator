import React, { useState } from 'react';
import { CheckCircle2, Mail, UserRound } from 'lucide-react';
import Button from '../Button';
import { isSupabaseConfigured, sendMagicLink, signInWithGoogle } from '../../services/supabase';
import { ErrorMessage } from '../ErrorMessage';

interface AuthPageProps {
  onContinueGuest: () => void;
  onOpenProfile: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onContinueGuest, onOpenProfile }) => {
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
    <div className="studio-shell py-9 pb-16 sm:py-14">
      <section className="mx-auto max-w-md">
        <h1 className="page-title text-center">Save your style across sessions</h1>
        <p className="mt-4 text-center text-sm leading-relaxed text-stone-700">Sign in to identify your account. Style briefs and your profile are stored in this browser.</p>

        {!isSupabaseConfigured && (
          <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-950">
            Sign-in is unavailable on this installation. You can still use a guest profile on this device.
          </p>
        )}

        <Button variant="outline" disabled={!isSupabaseConfigured || loading !== null} onClick={handleGoogle} className="mt-7 w-full" isLoading={loading === 'google'} loadingLabel="Opening Google">
          <span className="text-base font-bold text-plum-800" aria-hidden="true">G</span>
          Continue with Google
        </Button>

        <div className="my-5 flex items-center gap-3 text-sm text-stone-600"><span className="h-px flex-1 bg-stone-300" />or email<span className="h-px flex-1 bg-stone-300" /></div>

        <form onSubmit={handleEmail} className="space-y-4">
          <label className="grid gap-1.5 text-sm font-semibold">
            <span className="flex items-center gap-2"><Mail className="size-4 text-plum-700" aria-hidden="true" />Email address</span>
            <input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" disabled={!isSupabaseConfigured || loading !== null} className="studio-field disabled:opacity-65" />
          </label>
          <Button type="submit" disabled={!isSupabaseConfigured || !email.trim() || loading !== null} isLoading={loading === 'email'} loadingLabel="Sending link" className="w-full">Email me a sign-in link</Button>
        </form>

        {message && <p className="mt-5 flex gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800" role="status"><CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{message}</p>}
        {error && <div className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800"><ErrorMessage message={error} /></div>}
        <div className="mt-5 flex flex-wrap justify-center gap-x-5">
          <button type="button" onClick={onContinueGuest} className="min-h-11 text-sm font-semibold text-plum-700 underline underline-offset-4">Back to home</button>
          <button type="button" onClick={onOpenProfile} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-plum-700 underline underline-offset-4">
            <UserRound className="size-4" aria-hidden="true" /> Open guest profile
          </button>
        </div>
      </section>
    </div>
  );
};
