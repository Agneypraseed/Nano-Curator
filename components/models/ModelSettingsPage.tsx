import React from 'react';
import { ArrowRight, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import Button from '../Button';
import { ModelSelector } from '../wizard/ModelSelector';
import { WizardState } from '../../types';

interface ModelSettingsPageProps {
  data: WizardState;
  apiKey: string;
  hasServerKey: boolean;
  localTextApiUrl: string;
  localVtonApiUrl: string;
  onChange: (patch: Partial<WizardState>) => void;
  onApiKeyChange: (value: string) => void;
  onLocalEndpointsChange: (patch: Partial<{ text: string; vton: string }>) => void;
  onContinue: () => void;
}

export const ModelSettingsPage: React.FC<ModelSettingsPageProps> = ({
  data, apiKey, hasServerKey, localTextApiUrl, localVtonApiUrl,
  onChange, onApiKeyChange, onLocalEndpointsChange, onContinue,
}) => (
  <div className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
    <div className="mb-8 grid gap-6 rounded-[2.25rem] bg-stone-950 px-6 py-8 text-white shadow-xl sm:px-9 lg:grid-cols-[1fr_auto] lg:items-end">
      <div className="max-w-2xl">
        <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-teal-400/15 text-teal-300"><SlidersHorizontal className="h-5 w-5" /></div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">Model settings</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Choose how Nano Curator thinks.</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-stone-300">Select a provider, model, and credentials here. Your style brief stays focused on photos, wardrobe, and preferences.</p>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-stone-200"><CheckCircle2 className="h-4 w-4 text-teal-300" />Current: <span className="max-w-48 truncate text-white">{data.model}</span></div>
    </div>
    <ModelSelector data={data} apiKey={apiKey} hasServerKey={hasServerKey} localTextApiUrl={localTextApiUrl} localVtonApiUrl={localVtonApiUrl} onChange={onChange} onApiKeyChange={onApiKeyChange} onLocalEndpointsChange={onLocalEndpointsChange} />
    <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
      <p className="max-w-xl text-sm leading-6 text-stone-600">You can return to this page from the Models tab at any time. Your selection is kept while you move through the app.</p>
      <Button onClick={onContinue} className="w-full shrink-0 rounded-full px-7 sm:w-auto">Continue to style setup <ArrowRight className="h-4 w-4" /></Button>
    </div>
  </div>
);
