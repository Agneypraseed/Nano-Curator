import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Cloud, Save, UserRound } from 'lucide-react';
import Button from '../Button';
import { ErrorMessage } from '../ErrorMessage';
import { PageIntro } from '../PageIntro';
import { UserProfile } from '../../types';

interface ProfilePageProps {
  profile: UserProfile;
  sessionCount: number;
  wardrobeCount: number;
  onSave: (profile: UserProfile) => void;
  onStart: () => void;
  authEmail: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
  error: string | null;
}

const inputClass = 'studio-field';

export const ProfilePage: React.FC<ProfilePageProps> = ({ profile, sessionCount, wardrobeCount, onSave, onStart, authEmail, onSignIn, onSignOut, error }) => {
  const [draft, setDraft] = useState(profile);
  const [saved, setSaved] = useState(false);

  useEffect(() => setDraft(profile), [profile]);

  const update = (patch: Partial<UserProfile>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setSaved(false);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(draft);
    setSaved(true);
  };

  const initials = (draft.displayName || 'NC').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <div className="studio-shell max-w-6xl py-6 pb-16 sm:py-9 sm:pb-20">
      <PageIntro title="Your profile" description="Update the preferences you reuse in future style briefs." />

      <div className="mb-6 flex items-center gap-4 border-y studio-rule py-4 sm:gap-7">
        <div className="grid size-14 shrink-0 place-items-center rounded-full bg-plum-100 text-lg font-semibold text-plum-800" aria-hidden="true">{initials}</div>
        <dl className="flex flex-wrap gap-4 sm:gap-7">
          <div className="border-l border-stone-300 pl-4 sm:pl-7">
            <dt className="text-sm text-stone-700">Sessions</dt>
            <dd className="section-title text-2xl">{sessionCount}</dd>
          </div>
          <div className="border-l border-stone-300 pl-4 sm:pl-7">
            <dt className="text-sm text-stone-700">Wardrobe</dt>
            <dd className="section-title text-2xl">{wardrobeCount}</dd>
          </div>
        </dl>
      </div>
      {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><ErrorMessage message={error} /></div>}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,0.36fr)]">
        <form onSubmit={handleSubmit} className="studio-panel space-y-6 p-4 sm:p-6">
          <div>
            <h2 className="section-title text-2xl">About you</h2>
            <p className="mt-1 text-sm text-stone-500">Keep your style goals, lifestyle and account details in one place.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2"><span className="text-sm font-medium text-stone-700">Display name</span><input className={inputClass} value={draft.displayName} onChange={(e) => update({ displayName: e.target.value })} placeholder="Alex Morgan" /></label>
            <label className="space-y-2"><span className="text-sm font-medium text-stone-700">Email <span className="font-normal text-stone-400">(optional)</span></span><input type="email" className={inputClass} value={draft.email} onChange={(e) => update({ email: e.target.value })} placeholder="alex@example.com" /></label>
            <label className="space-y-2"><span className="text-sm font-medium text-stone-700">Role or occupation</span><input className={inputClass} value={draft.jobTitle} onChange={(e) => update({ jobTitle: e.target.value })} placeholder="Creative director" /></label>
            <label className="space-y-2"><span className="text-sm font-medium text-stone-700">Location</span><input className={inputClass} value={draft.location} onChange={(e) => update({ location: e.target.value })} placeholder="Berlin, Germany" /></label>
          </div>

          <label className="block space-y-2"><span className="text-sm font-medium text-stone-700">About your lifestyle</span><textarea className={inputClass + ' min-h-24 resize-y'} value={draft.bio} onChange={(e) => update({ bio: e.target.value })} placeholder="Work setting, commute, typical week, comfort needs..." /></label>
          <label className="block space-y-2"><span className="text-sm font-medium text-stone-700">Long-term style goals</span><textarea className={inputClass + ' min-h-24 resize-y'} value={draft.styleGoals} onChange={(e) => update({ styleGoals: e.target.value })} placeholder="Build a versatile professional wardrobe with fewer, better pieces." /></label>

          <div className="border-t border-stone-100 pt-6">
            <h2 className="section-title text-2xl">Fit and preferences</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              <label className="space-y-2"><span className="text-sm font-medium text-stone-700">Top size</span><input className={inputClass} value={draft.topSize} onChange={(e) => update({ topSize: e.target.value })} placeholder="M / 40" /></label>
              <label className="space-y-2"><span className="text-sm font-medium text-stone-700">Bottom size</span><input className={inputClass} value={draft.bottomSize} onChange={(e) => update({ bottomSize: e.target.value })} placeholder="32 / 42" /></label>
              <label className="space-y-2"><span className="text-sm font-medium text-stone-700">Shoe size</span><input className={inputClass} value={draft.shoeSize} onChange={(e) => update({ shoeSize: e.target.value })} placeholder="EU 42" /></label>
            </div>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <label className="space-y-2"><span className="text-sm font-medium text-stone-700">Preferred colors</span><input className={inputClass} value={draft.preferredColors} onChange={(e) => update({ preferredColors: e.target.value })} placeholder="Navy, olive, warm neutrals" /></label>
              <label className="space-y-2"><span className="text-sm font-medium text-stone-700">Colors to avoid</span><input className={inputClass} value={draft.avoidColors} onChange={(e) => update({ avoidColors: e.target.value })} placeholder="Neon, bright orange" /></label>
            </div>
            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-medium text-stone-700">Preferred fit</legend>
              <div className="grid grid-cols-3 gap-2">
                {(['relaxed', 'balanced', 'tailored'] as const).map((fit) => <button key={fit} type="button" aria-pressed={draft.fitPreference === fit} onClick={() => update({ fitPreference: fit })} className={'min-h-11 rounded-md border px-1.5 py-2.5 sm:px-3 text-sm font-medium capitalize transition ' + (draft.fitPreference === fit ? 'border-plum-700 bg-plum-50 text-plum-800' : 'border-stone-200 text-stone-600 hover:border-stone-300')}>{fit}</button>)}
              </div>
            </fieldset>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-stone-100 pt-6">
            <Button type="submit"><Save className="size-4" />Save profile</Button>
            {saved && <span role="status" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-800"><Check className="h-4 w-4" />Saved on this device</span>}
          </div>
        </form>

        <aside className="space-y-4">
          <section className="rounded-xl border border-plum-200 bg-plum-50 p-5">
            <UserRound className="mb-3 size-5 text-plum-700" />
            <h2 className="section-title text-2xl">Start with your preferences</h2>
            <p className="mt-2 text-sm leading-6 text-stone-700">Your saved location, colors, lifestyle and goals prefill new style briefs.</p>
            <Button onClick={onStart} className="mt-4 w-full">Start a style brief<ArrowRight className="size-4" /></Button>
          </section>
          <section className="studio-panel p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-stone-900"><Cloud className="h-4 w-4 text-stone-500" />{authEmail ? 'Account connected' : 'Guest profile'}</div>
            <p className="mt-3 break-words text-sm leading-6 text-stone-500">{authEmail ? `Signed in as ${authEmail}. Profile changes are saved on this device.` : 'Your guest profile is saved on this device. You can sign in with email or Google.'}</p>
            <button type="button" onClick={authEmail ? onSignOut : onSignIn} className="mt-4 text-sm font-semibold text-plum-700 hover:text-plum-900">{authEmail ? 'Sign out' : 'Sign in or create account'}</button>
          </section>
        </aside>
      </div>
    </div>
  );
};
