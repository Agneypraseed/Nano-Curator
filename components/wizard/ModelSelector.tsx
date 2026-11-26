import { useState } from 'react';
import { Circle, CircleDot, Eye, EyeOff } from 'lucide-react';
import type { AIProvider, WizardState } from '../../types';

interface ModelSelectorProps {
  data: WizardState;
  apiKey: string;
  hasServerKey: boolean;
  localTextApiUrl: string;
  localVtonApiUrl: string;
  onChange: (patch: Partial<WizardState>) => void;
  onApiKeyChange: (value: string) => void;
  onLocalEndpointsChange: (patch: Partial<{ text: string; vton: string }>) => void;
}

const providers = {
  gemini: { name: 'Gemini', models: [{ value: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' }] },
  openai: { name: 'OpenAI', models: [{ value: 'gpt-5.4-nano', label: 'GPT-5.4 Nano' }] },
  openrouter: { name: 'OpenRouter', models: [{ value: 'stealth/ox-alpha', label: 'Ox Alpha' }, { value: 'openrouter/free', label: 'OpenRouter Free Router' }] },
  meta: { name: 'Meta', models: [{ value: 'muse-spark-1.3', label: 'Muse Spark 1.3' }, { value: 'muse-wonder-1.0', label: 'Muse Wonder 1.0' }, { value: 'muse-ember-1.0', label: 'Muse Ember 1.0' }] },
  local: { name: 'Local', models: [] },
};

const providerIds: AIProvider[] = ['gemini', 'openai', 'openrouter', 'meta', 'local'];
const fieldLabel = 'grid min-w-0 gap-1.5 text-sm font-semibold text-stone-800';

export function ModelSelector({
  data, apiKey, hasServerKey, localTextApiUrl, localVtonApiUrl, onChange, onApiKeyChange, onLocalEndpointsChange,
}: ModelSelectorProps) {
  const [showKey, setShowKey] = useState(false);
  const provider = providers[data.backend];
  const isLocal = data.backend === 'local';
  const isCustomModel = !isLocal && !provider.models.some((model) => model.value === data.model);
  const credentialStatus = hasServerKey ? 'Server key configured' : 'API key required';
  const status = isLocal
    ? (localTextApiUrl.trim() && localVtonApiUrl.trim() ? 'Local endpoints entered' : 'Local endpoints required')
    : (apiKey.trim() ? 'Session key entered' : credentialStatus);
  const hasConfiguration = isLocal ? Boolean(localTextApiUrl.trim() && localVtonApiUrl.trim()) : Boolean(apiKey.trim() || hasServerKey);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(16rem,0.9fr)]">
      <section className="studio-panel grid gap-6 p-4 sm:p-7" aria-labelledby="provider-title">
        <h2 id="provider-title" className="section-title text-2xl">AI provider</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(7.25rem,1fr))]" role="group" aria-label="AI provider">
          {providerIds.map((id) => {
            const selected = data.backend === id;
            const Icon = selected ? CircleDot : Circle;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  if (selected) return;
                  setShowKey(false);
                  onChange({ backend: id, model: providers[id].models[0]?.value || 'local' });
                }}
                className="flex min-h-12 items-center gap-2 rounded-md border border-stone-300 px-2.5 text-left text-sm font-semibold hover:border-plum-600 hover:bg-plum-50 aria-pressed:border-plum-600 aria-pressed:bg-plum-100 aria-pressed:text-plum-900 sm:px-3"
              >
                <Icon className="size-4 shrink-0" strokeWidth={selected ? 2.25 : 1.5} aria-hidden="true" />
                {providers[id].name}
              </button>
            );
          })}
        </div>

        <p role="status" className={'flex items-center gap-2 text-sm font-semibold ' + (hasConfiguration ? 'text-emerald-800' : 'text-amber-800')}>
          <span className="size-2 rounded-full bg-current" aria-hidden="true" />{status}
        </p>

        {isLocal ? (
          <>
            <div className={fieldLabel}>
              <label htmlFor="local-text-endpoint">Local text endpoint</label>
              <input id="local-text-endpoint" aria-describedby="local-text-help" type="url" value={localTextApiUrl} onChange={(event) => onLocalEndpointsChange({ text: event.target.value })} placeholder="http://localhost:11434/v1" className="studio-field" />
              <p id="local-text-help" className="text-xs font-normal leading-relaxed text-stone-600">OpenAI-compatible chat completions endpoint.</p>
            </div>
            <div className={fieldLabel}>
              <label htmlFor="local-try-on-endpoint">Virtual try-on endpoint</label>
              <input id="local-try-on-endpoint" aria-describedby="local-try-on-help" type="url" value={localVtonApiUrl} onChange={(event) => onLocalEndpointsChange({ vton: event.target.value })} placeholder="http://127.0.0.1:7860" className="studio-field" />
              <p id="local-try-on-help" className="text-xs font-normal leading-relaxed text-stone-600">Gradio-compatible image generation endpoint.</p>
            </div>
          </>
        ) : (
          <>
            <div className={fieldLabel}>
              <label htmlFor="provider-model">Model</label>
              <select
                id="provider-model"
                value={isCustomModel ? '__custom__' : data.model}
                onChange={(event) => onChange({ model: event.target.value === '__custom__' ? '' : event.target.value })}
                className="studio-field"
              >
                {provider.models.map((model) => <option key={model.value} value={model.value}>{model.label}</option>)}
                <option value="__custom__">Enter a custom model ID…</option>
              </select>
            </div>
            {isCustomModel && (
              <label className={fieldLabel}>Custom model ID
                <input type="text" autoComplete="off" spellCheck={false} value={data.model} onChange={(event) => onChange({ model: event.target.value })} placeholder={data.backend === 'openrouter' ? 'provider/model-name' : 'Enter the provider model ID'} className="studio-field" />
              </label>
            )}
            <div className="grid gap-1.5">
              <label htmlFor="provider-key" className="text-sm font-semibold text-stone-800">{provider.name} API key</label>
              <div className="relative">
                <input
                  id="provider-key"
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(event) => onApiKeyChange(event.target.value)}
                  placeholder={hasServerKey ? 'Optional override for the server key' : 'Enter your API key'}
                  autoComplete="off"
                  spellCheck={false}
                  className="studio-field pr-14"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((visible) => !visible)}
                  aria-label={showKey ? 'Hide API key' : 'Show API key'}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-stone-600 hover:bg-plum-50 hover:text-plum-800"
                >
                  {showKey ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <aside className="rounded-xl border border-plum-200 bg-plum-50 p-5 sm:p-6">
        <h2 className="section-title text-2xl">Setup guidance</h2>
        {isLocal ? (
          <p className="mt-3 text-sm leading-relaxed text-stone-700">Enter both endpoints to use local analysis and virtual try-on. Select a cloud provider to extract pieces from wardrobe photos.</p>
        ) : (
          <>
            <p className="mt-3 text-sm leading-relaxed text-stone-700">Choose a preset or enter a model ID supported by {provider.name}. If a server key is configured, you can start using it immediately.</p>
            {data.backend === 'meta' && <p className="mt-3 text-sm leading-relaxed text-stone-700">Muse analyzes the brief, Muse Image renders previews, and SAM 3.1 isolates wardrobe pieces with the same key.</p>}
            <p className="mt-4 border-t border-plum-200 pt-4 text-sm leading-relaxed text-stone-700">Keys you enter apply to this browser session and are sent to the server when you make a request.</p>
          </>
        )}
      </aside>
    </div>
  );
}
