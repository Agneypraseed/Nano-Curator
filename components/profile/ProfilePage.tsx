import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Cloud, History, Save, Shirt, UserRound } from 'lucide-react';
import Button from '../Button';
import { UserProfile } from '../../types';

interface ProfilePageProps {
  profile: UserProfile;
  sessionCount: number;
  wardrobeCount: number;
  onSave: (profile: UserProfile) => void;
  onStart: () => void;
}

const inputClass = 'w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100';

export const ProfilePage: React.FC<ProfilePageProps> = ({ profile, sessionCount, wardrobeCount, onSave, onStart }) => {
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
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="flex items-center gap-5 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-3xl bg-stone-950 text-2xl font-semibold text-white">{initials}</div>
          <div className="min-w-0">
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">Personal profile</p>
            <h1 className="truncate text-3xl font-semibold tracking-tight text-stone-950">{draft.displayName || 'Your profile'}</h1>
            <p className="mt-2 text-sm text-stone-500">Saved on this device and used to personalize future style briefs.</p>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <History className="mb-5 h-5 w-5 text-teal-700" />
            <div className="text-3xl font-semibold text-stone-950">{sessionCount}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wider text-stone-500">Sessions</div>
          </div>
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <Shirt className="mb-5 h-5 w-5 text-teal-700" />
            <div className="text-3xl font-semibold text-stone-950">{wardrobeCount}</div>
            <div className="mt-1 text-xs font-medium uppercase tracking-wider text-stone-500">Wardrobe</div>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit} className="space-y-6 rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <div>
            <h2 className="text-xl font-semibold text-stone-950">About you</h2>
            <p className="mt-1 text-sm text-stone-500">These details help recommendations fit your real life, sizing, and taste.</p>
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
            <h2 className="text-xl font-semibold text-stone-950">Fit and preferences</h2>
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
                {(['relaxed', 'balanced', 'tailored'] as const).map((fit) => <button key={fit} type="button" onClick={() => update({ fitPreference: fit })} className={'rounded-xl border px-3 py-2.5 text-sm font-medium capitalize transition ' + (draft.fitPreference === fit ? 'border-teal-700 bg-teal-50 text-teal-800' : 'border-stone-200 text-stone-600 hover:border-stone-300')}>{fit}</button>)}
              </div>
            </fieldset>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-stone-100 pt-6">
            <Button type="submit"><Save className="mr-2 h-4 w-4" />Save profile</Button>
            {saved && <span className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700"><Check className="h-4 w-4" />Saved on this device</span>}
          </div>
        </form>

        <aside className="space-y-4">
          <section className="rounded-[2rem] border border-stone-200 bg-stone-950 p-6 text-white shadow-sm">
            <UserRound className="mb-8 h-6 w-6 text-teal-300" />
            <h2 className="text-xl font-semibold">Put your profile to work</h2>
            <p className="mt-2 text-sm leading-6 text-stone-300">Your saved location, colors, lifestyle, sizing, and goals prefill new style briefs.</p>
            <Button onClick={onStart} className="mt-6 w-full bg-white text-stone-950 hover:bg-stone-100">Start a style brief<ArrowRight className="ml-2 h-4 w-4" /></Button>
          </section>
          <section className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-stone-900"><Cloud className="h-4 w-4 text-stone-500" />About login</div>
            <p className="mt-3 text-sm leading-6 text-stone-500">A login should arrive with encrypted cloud sync. Until then, your profile and sessions remain private to this browser.</p>
          </section>
        </aside>
      </div>
    </div>
  );
};
