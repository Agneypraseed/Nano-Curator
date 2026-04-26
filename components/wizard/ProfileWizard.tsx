import React from 'react';
import { Link as LinkIcon, Palette, ShoppingBag, Sparkles, Scissors, X } from 'lucide-react';
import { ImageUploader } from '../ImageUploader';
import Button from '../Button';
import {
  BudgetLevel,
  ClimatePreference,
  DressCodePreference,
  ReferenceTab,
  WizardState,
} from '../../types';

interface ProfileWizardProps {
  data: WizardState;
  error: string | null;
  activeReferenceTab: ReferenceTab;
  onActiveReferenceTabChange: (tab: ReferenceTab) => void;
  onChange: (patch: Partial<WizardState>) => void;
  onAddUserPhoto: (base64: string) => void;
  onRemoveUserPhoto: (index: number) => void;
  onGenerate: () => void;
}

const occasionSuggestions = ['Interview', 'Wedding guest', 'Creative office', 'Capsule wardrobe', 'Date night', 'Conference'];
const budgetOptions: BudgetLevel[] = ['thrift', 'mid-range', 'premium', 'mixed'];
const climateOptions: ClimatePreference[] = ['hot', 'mild', 'cool', 'cold', 'variable'];
const dressCodeOptions: DressCodePreference[] = ['casual', 'smart-casual', 'business-casual', 'business-formal', 'event-ready'];

const selectButtonClass = (selected: boolean) =>
  `rounded-full border px-4 py-2 text-sm font-medium transition ${
    selected
      ? 'border-slate-900 bg-slate-900 text-white'
      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
  }`;

export const ProfileWizard: React.FC<ProfileWizardProps> = ({
  data,
  error,
  activeReferenceTab,
  onActiveReferenceTabChange,
  onChange,
  onAddUserPhoto,
  onRemoveUserPhoto,
  onGenerate,
}) => {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mb-10 max-w-3xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Build your style brief</h1>
        <p className="text-base leading-7 text-slate-600">
          Add enough context that the recommendations can make real tradeoffs instead of producing generic outfit images.
        </p>
      </div>

      {error && (
        <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[1fr_1fr]">
        <section className="space-y-8">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Photos</h2>
              <span className="text-sm text-slate-500">{data.userPhotos.length} / 5</span>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {data.userPhotos.map((photo, index) => (
                <div key={`${photo.slice(0, 12)}-${index}`} className="group relative aspect-square overflow-hidden rounded-3xl border border-slate-200">
                  <img src={`data:image/jpeg;base64,${photo}`} alt={`User upload ${index + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => onRemoveUserPhoto(index)}
                    className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition group-hover:opacity-100"
                    aria-label="Remove photo"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {data.userPhotos.length < 5 && <ImageUploader onImageSelected={onAddUserPhoto} compact label="Add photo" />}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">Occasion and goal</h2>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {occasionSuggestions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChange({ occasion: option, goals: data.goals || option })}
                  className={selectButtonClass(data.occasion === option)}
                >
                  {option}
                </button>
              ))}
            </div>

            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Main goal</span>
                <input
                  type="text"
                  value={data.goals}
                  onChange={(event) => onChange({ goals: event.target.value })}
                  placeholder="What should this style direction solve?"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Lifestyle and constraints</span>
                <textarea
                  value={data.lifestyle}
                  onChange={(event) => onChange({ lifestyle: event.target.value })}
                  placeholder="Work context, commute, fabrics, silhouette preferences, comfort needs."
                  className="min-h-32 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </label>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Palette className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">Reference direction</h2>
            </div>

            <div className="mb-4 inline-flex rounded-full bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => onActiveReferenceTabChange('image')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${activeReferenceTab === 'image' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                Upload image
              </button>
              <button
                type="button"
                onClick={() => onActiveReferenceTabChange('url')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${activeReferenceTab === 'url' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                Paste link
              </button>
            </div>

            {activeReferenceTab === 'image' ? (
              data.referenceImage ? (
                <div className="group relative overflow-hidden rounded-3xl border border-slate-200">
                  <img src={`data:image/jpeg;base64,${data.referenceImage}`} alt="Reference upload" className="h-56 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => onChange({ referenceImage: null })}
                    className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white"
                    aria-label="Remove reference image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <ImageUploader onImageSelected={(base64) => onChange({ referenceImage: base64 })} label="Upload reference image" />
              )
            ) : (
              <label className="grid gap-2">
                <span className="text-sm text-slate-500">Paste a product, editorial, or inspiration link.</span>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:border-indigo-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
                  <LinkIcon className="h-4 w-4 text-slate-400" />
                  <input
                    type="url"
                    value={data.referenceUrl}
                    onChange={(event) => onChange({ referenceUrl: event.target.value })}
                    placeholder="https://..."
                    className="w-full bg-transparent outline-none"
                  />
                </div>
              </label>
            )}
          </div>
        </section>

        <section className="space-y-8">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Style constraints</h2>

            <div className="grid gap-5">
              <div>
                <span className="mb-3 block text-sm font-medium text-slate-700">Budget</span>
                <div className="flex flex-wrap gap-2">
                  {budgetOptions.map((option) => (
                    <button key={option} type="button" onClick={() => onChange({ budget: option })} className={selectButtonClass(data.budget === option)}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-3 block text-sm font-medium text-slate-700">Climate</span>
                <div className="flex flex-wrap gap-2">
                  {climateOptions.map((option) => (
                    <button key={option} type="button" onClick={() => onChange({ climate: option })} className={selectButtonClass(data.climate === option)}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-3 block text-sm font-medium text-slate-700">Dress code</span>
                <div className="flex flex-wrap gap-2">
                  {dressCodeOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onChange({ dressCode: option })}
                      className={selectButtonClass(data.dressCode === option)}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Preferred colors</span>
                  <input
                    type="text"
                    value={data.preferredColors}
                    onChange={(event) => onChange({ preferredColors: event.target.value })}
                    placeholder="Navy, olive, monochrome, warm neutrals"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Avoid colors</span>
                  <input
                    type="text"
                    value={data.avoidColors}
                    onChange={(event) => onChange({ avoidColors: event.target.value })}
                    placeholder="Neon, pastel pink, bright orange"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Location</span>
                  <input
                    type="text"
                    value={data.location}
                    onChange={(event) => onChange({ location: event.target.value })}
                    placeholder="Berlin, Austin, Tokyo"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-slate-700">Weather notes</span>
                  <input
                    type="text"
                    value={data.weatherNotes}
                    onChange={(event) => onChange({ weatherNotes: event.target.value })}
                    placeholder="Rainy week, humid, 10-15°C"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-slate-700">Brands to avoid</span>
                <input
                  type="text"
                  value={data.avoidBrands}
                  onChange={(event) => onChange({ avoidBrands: event.target.value })}
                  placeholder="Fast fashion only, synthetic-heavy brands, no luxury labels"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                />
              </label>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Output options</h2>
            <div className="grid gap-4">
              <label className="flex items-start gap-3 rounded-3xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={data.includeHaircut}
                  onChange={(event) => onChange({ includeHaircut: event.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <div>
                  <div className="flex items-center gap-2 font-medium text-slate-900">
                    <Scissors className="h-4 w-4" />
                    Include haircut direction
                  </div>
                  <p className="mt-1 text-sm text-slate-500">Adds a separate hair recommendation and reference image.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-3xl border border-slate-200 p-4">
                <input
                  type="checkbox"
                  checked={data.findOutfits}
                  onChange={(event) => onChange({ findOutfits: event.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <div>
                  <div className="flex items-center gap-2 font-medium text-slate-900">
                    <ShoppingBag className="h-4 w-4" />
                    Find purchasable products
                  </div>
                  <p className="mt-1 text-sm text-slate-500">Adds per-look product suggestions and an aggregated shopping board.</p>
                </div>
              </label>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
            <h2 className="text-lg font-semibold">Generate</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              The first pass builds three distinct looks, a best-fit recommendation, optional haircut guidance, and reusable shopping suggestions.
            </p>
            <Button onClick={onGenerate} disabled={data.userPhotos.length < 1} className="mt-5 w-full bg-white text-slate-950 hover:bg-slate-100">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate style collection
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};
