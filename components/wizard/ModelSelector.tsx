import React from 'react';
import { Cpu, KeyRound, Link2, Sparkles } from 'lucide-react';
import { AIProvider, WizardState } from '../../types';

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

const providers = [
  { id: 'openai' as const, name: 'OpenAI', note: 'Cloud', detail: 'One key for every available OpenAI model.' },
  { id: 'gemini' as const, name: 'Gemini', note: 'Google', detail: 'One key for Gemini analysis and image generation.' },
  { id: 'local' as const, name: 'Local', note: 'Private', detail: 'Connect your local text and virtual try-on services.' },
];

const openAIModels = [
  { value: 'gpt-5.4-nano', label: 'GPT-5.4 Nano - lowest cost' },
];

const defaultModel = (provider: AIProvider) => {
  if (provider === 'openai') return 'gpt-5.4-nano';
  if (provider === 'gemini') return 'gemini-3.5-flash';
  return 'local';
};

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  data,
  apiKey,
  hasServerKey,
  localTextApiUrl,
  localVtonApiUrl,
  onChange,
  onApiKeyChange,
  onLocalEndpointsChange,
}) => {
  const selectProvider = (provider: AIProvider) => {
    onChange({ backend: provider, model: data.backend === provider ? data.model : defaultModel(provider) });
  };

  return (
    <section className="mb-8 overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-[0_20px_60px_-42px_rgba(28,25,23,0.45)]">
      <div className="flex flex-col gap-2 border-b border-stone-100 px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">AI provider</p>
          <h2 className="text-xl font-semibold tracking-tight text-stone-950">Choose one provider, then choose a model</h2>
        </div>
        <p className="max-w-sm text-sm leading-6 text-stone-500">Each cloud provider shares one key across all of its models. Settings stay with your current session.</p>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-3">
        {providers.map((provider) => {
          const selected = data.backend === provider.id;
          const cardClass = selected
            ? 'border-teal-700 bg-teal-50/70 shadow-[0_0_0_1px_#0f766e]'
            : 'border-stone-200 bg-white hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-lg';
          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => selectProvider(provider.id)}
              className={'group min-h-36 rounded-2xl border p-4 text-left transition ' + cardClass}
            >
              <div className="mb-6 flex items-center justify-between">
                <span className={'grid h-9 w-9 place-items-center rounded-xl ' + (selected ? 'bg-teal-700 text-white' : 'bg-stone-100 text-stone-600')}>
                  {provider.id === 'local' ? <Cpu className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </span>
                <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-500">{provider.note}</span>
              </div>
              <div className="font-semibold text-stone-950">{provider.name}</div>
              <div className="mt-1 text-xs leading-5 text-stone-500">{provider.detail}</div>
            </button>
          );
        })}
      </div>

      {data.backend !== 'local' ? (
        <div className="grid gap-4 border-t border-stone-100 bg-stone-50/70 px-5 py-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Model</span>
            {data.backend === 'openai' ? (
              <select
                value={data.model}
                onChange={(event) => onChange({ model: event.target.value })}
                className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
              >
                {openAIModels.map((model) => <option key={model.value} value={model.value}>{model.label}</option>)}
              </select>
            ) : (
              <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-900">Gemini 3.5 Flash</div>
            )}
          </label>

          <label className="space-y-2">
            <span className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
              <span className="flex items-center gap-2"><KeyRound className="h-3.5 w-3.5" />{data.backend === 'openai' ? 'OpenAI' : 'Gemini'} API key</span>
              <span className={hasServerKey ? 'text-teal-700' : 'text-amber-700'}>{hasServerKey ? 'Server key configured' : 'Required'}</span>
            </span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => onApiKeyChange(event.target.value)}
              placeholder={hasServerKey ? 'Using server key - enter to override' : data.backend === 'openai' ? 'sk-...' : 'AIza...'}
              autoComplete="off"
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            />
          </label>
        </div>
      ) : (
        <div className="grid gap-4 border-t border-stone-100 bg-stone-50/70 px-5 py-5 md:grid-cols-2">
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500"><Link2 className="h-3.5 w-3.5" />Local text endpoint</span>
            <input
              type="url"
              value={localTextApiUrl}
              onChange={(event) => onLocalEndpointsChange({ text: event.target.value })}
              placeholder="http://localhost:11434/v1"
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            />
            <span className="block text-xs leading-5 text-stone-500">OpenAI-compatible chat completions endpoint.</span>
          </label>
          <label className="space-y-2">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500"><Link2 className="h-3.5 w-3.5" />Virtual try-on endpoint</span>
            <input
              type="url"
              value={localVtonApiUrl}
              onChange={(event) => onLocalEndpointsChange({ vton: event.target.value })}
              placeholder="http://127.0.0.1:7860"
              className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            />
            <span className="block text-xs leading-5 text-stone-500">Gradio-compatible image generation endpoint.</span>
          </label>
        </div>
      )}
    </section>
  );
};
