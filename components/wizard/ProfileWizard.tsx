import React from 'react';
import { Check, Plus, CloudSun, Coins, Info, Link as LinkIcon, Palette, Shirt, ShoppingBag, Sparkles, Scissors, X } from 'lucide-react';
import { ImageUploader } from '../ImageUploader';
import Button from '../Button';
import { ModelSelector } from './ModelSelector';
import {
  BudgetLevel,
  ClimatePreference,
  DressCodePreference,
  ReferenceTab,
  WeatherMode,
  WizardState,
} from '../../types';

interface ProfileWizardProps {
  data: WizardState;
  error: string | null;
  activeReferenceTab: ReferenceTab;
  onActiveReferenceTabChange: (tab: ReferenceTab) => void;
  onChange: (patch: Partial<WizardState>) => void;
  apiKey: string;
  hasServerKey: boolean;
  onApiKeyChange: (value: string) => void;
  localTextApiUrl: string;
  localVtonApiUrl: string;
  onLocalEndpointsChange: (patch: Partial<{ text: string; vton: string }>) => void;
  onAddUserPhoto: (base64: string) => void;
  onRemoveUserPhoto: (index: number) => void;
  wardrobeLibrary: string[];
  onNavigateWardrobe: () => void;
  onGenerate: () => void;
}

const occasionSuggestions = ['Interview', 'Wedding guest', 'Creative office', 'Capsule wardrobe', 'Date night', 'Conference'];
const budgetOptions: BudgetLevel[] = ['thrift', 'mid-range', 'premium', 'mixed'];
const climateOptions: ClimatePreference[] = ['hot', 'mild', 'cool', 'cold', 'variable'];
const dressCodeOptions: DressCodePreference[] = ['casual', 'smart-casual', 'business-casual', 'business-formal', 'event-ready'];
const weatherModes: WeatherMode[] = ['auto', 'manual'];

const selectButtonClass = (selected: boolean) =>
  `rounded-full border px-4 py-2 text-sm font-medium transition ${
    selected
      ? 'border-stone-900 bg-stone-900 text-white'
      : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900'
  }`;

export const ProfileWizard: React.FC<ProfileWizardProps> = ({
  data,
  error,
  activeReferenceTab,
  onActiveReferenceTabChange,
  onChange,
  apiKey,
  hasServerKey,
  onApiKeyChange,
  localTextApiUrl,
  localVtonApiUrl,
  onLocalEndpointsChange,
  onAddUserPhoto,
  onRemoveUserPhoto,
  wardrobeLibrary,
  onNavigateWardrobe,
  onGenerate,
}) => {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mb-10 max-w-3xl space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">Build your style brief</h1>
        <p className="text-base leading-7 text-stone-600">
          Add enough context that the recommendations can make real tradeoffs instead of producing generic outfit images.
        </p>
      </div>

      {error && (
        <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <ModelSelector
        data={data}
        apiKey={apiKey}
        hasServerKey={hasServerKey}
        localTextApiUrl={localTextApiUrl}
        localVtonApiUrl={localVtonApiUrl}
        onChange={onChange}
        onApiKeyChange={onApiKeyChange}
        onLocalEndpointsChange={onLocalEndpointsChange}
      />

      <div className="mb-8 rounded-[2.5rem] border border-stone-200 bg-white p-8 shadow-sm">
        <h2 className="mb-6 text-xl font-bold text-stone-900 flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-teal-600" />
          Quick Try-On Setup
        </h2>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl border border-stone-100 bg-stone-50/50 p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-stone-900">Photos of me</h3>
              <span className="text-sm text-stone-500">{data.userPhotos.length} / 5</span>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {data.userPhotos.map((photo, index) => (
                <div key={`${photo.slice(0, 12)}-${index}`} className="group relative aspect-square overflow-hidden rounded-3xl border border-stone-200">
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

          <div className="rounded-3xl border border-stone-100 bg-stone-50/50 p-6 flex flex-col justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Shirt className="h-5 w-5 text-teal-600" />
                <h3 className="text-lg font-semibold text-stone-900">Target garment</h3>
              </div>
              <p className="mb-4 text-sm leading-6 text-stone-500">
                Upload the specific dress or outfit you want to try on. Required for high-fidelity Local try-on.
              </p>
            </div>
            {data.garmentImage ? (
              <div className="group relative overflow-hidden rounded-3xl border border-stone-200">
                <img src={`data:image/jpeg;base64,${data.garmentImage}`} alt="Garment upload" className="h-56 w-full object-cover object-top" />
                <button
                  type="button"
                  onClick={() => onChange({ garmentImage: null })}
                  className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white"
                  aria-label="Remove garment image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <ImageUploader onImageSelected={(base64) => onChange({ garmentImage: base64 })} label="Upload target garment" />
            )}
          </div>
        </div>

        {data.userPhotos.length >= 1 && (
          <div className="mt-8 flex justify-center animate-fade-in">
            <button
              onClick={onGenerate}
              className="inline-flex items-center justify-center px-10 py-4 border border-transparent text-base font-semibold rounded-full text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 shadow-xl shadow-teal-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Quick Try-On
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-8 xl:grid-cols-[1fr_1fr]">
        <section className="space-y-8">
          <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shirt className="h-5 w-5 text-teal-600" />
                <h2 className="text-lg font-semibold text-stone-900">Select Wardrobe Pieces</h2>
              </div>
              <button
                type="button"
                onClick={onNavigateWardrobe}
                className="text-xs font-semibold text-teal-600 hover:text-teal-700 transition"
              >
                Manage Library
              </button>
            </div>
            <p className="mb-4 text-sm leading-6 text-stone-500">
              Select which pieces of your existing wardrobe library to include for matching suggestions in this session.
            </p>

            {wardrobeLibrary.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-200 bg-stone-50/50 p-8 text-center">
                <p className="text-sm text-stone-500 mb-4">Your wardrobe library is empty.</p>
                <button
                  type="button"
                  onClick={onNavigateWardrobe}
                  className="inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-semibold rounded-full text-white bg-teal-600 hover:bg-teal-700 transition"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Wardrobe Items
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {wardrobeLibrary.map((photo, index) => {
                  const isSelected = data.wardrobePhotos.includes(photo);
                  return (
                    <div
                      key={`wizard-wardrobe-${index}`}
                      onClick={() => {
                        const nextPhotos = isSelected
                          ? data.wardrobePhotos.filter((p) => p !== photo)
                          : [...data.wardrobePhotos, photo];
                        onChange({ wardrobePhotos: nextPhotos });
                      }}
                      className={`group relative aspect-square overflow-hidden rounded-3xl border cursor-pointer transition duration-200 ${
                        isSelected ? 'border-teal-600 ring-2 ring-teal-100' : 'border-stone-200'
                      }`}
                    >
                      <img src={`data:image/jpeg;base64,${photo}`} alt={`Wardrobe item ${index + 1}`} className="h-full w-full object-cover" />
                      
                      {/* Checkmark overlay */}
                      <div
                        className={`absolute inset-0 flex items-center justify-center bg-teal-900/10 transition-opacity duration-200 ${
                          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full border border-white text-white transition-all duration-300 ${
                            isSelected ? 'bg-teal-600 scale-100' : 'bg-black/40 scale-90 group-hover:scale-100'
                          }`}
                        >
                          <Check className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Palette className="h-5 w-5 text-teal-600" />
              <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-900">
                Reference direction
                <div className="group relative flex items-center justify-center">
                  <Info className="h-4 w-4 text-stone-400 cursor-help hover:text-stone-600 transition" />
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 rounded-xl bg-stone-800 p-3 text-center text-xs font-normal leading-relaxed text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100">
                    Upload a style inspiration (e.g., a Pinterest image) to set the aesthetic "vibe". The AI uses this as a guide but won't extract the exact clothes. To wear a specific piece of clothing, upload a "Target garment" instead.
                    <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-stone-800"></div>
                  </div>
                </div>
              </h2>
            </div>

            <div className="mb-4 inline-flex rounded-full bg-stone-100 p-1">
              <button
                type="button"
                onClick={() => onActiveReferenceTabChange('image')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${activeReferenceTab === 'image' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
              >
                Upload image
              </button>
              <button
                type="button"
                onClick={() => onActiveReferenceTabChange('url')}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${activeReferenceTab === 'url' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}
              >
                Paste link
              </button>
            </div>

            {activeReferenceTab === 'image' ? (
              data.referenceImage ? (
                <div className="group relative overflow-hidden rounded-3xl border border-stone-200">
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
                <span className="text-sm text-stone-500">Paste a product, editorial, or inspiration link.</span>
                <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 focus-within:border-teal-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-teal-100">
                  <LinkIcon className="h-4 w-4 text-stone-400" />
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

          <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-stone-900">Output options</h2>
            <div className="grid gap-4">
              <label className="flex items-start gap-3 rounded-3xl border border-stone-200 p-4">
                <input
                  type="checkbox"
                  checked={data.includeHaircut}
                  onChange={(event) => onChange({ includeHaircut: event.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                />
                <div>
                  <div className="flex items-center gap-2 font-medium text-stone-900">
                    <Scissors className="h-4 w-4" />
                    Include haircut direction
                  </div>
                  <p className="mt-1 text-sm text-stone-500">Adds a separate hair recommendation and reference image.</p>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-3xl border border-stone-200 p-4">
                <input
                  type="checkbox"
                  checked={data.findOutfits}
                  onChange={(event) => onChange({ findOutfits: event.target.checked })}
                  className="mt-1 h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-900"
                />
                <div>
                  <div className="flex items-center gap-2 font-medium text-stone-900">
                    <ShoppingBag className="h-4 w-4" />
                    Find purchasable products
                  </div>
                  <p className="mt-1 text-sm text-stone-500">Adds per-look product suggestions, lower-cost alternatives, and an aggregated shopping board.</p>
                </div>
              </label>
            </div>
          </div>
        </section>

        <section className="space-y-8">
          <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Coins className="h-5 w-5 text-teal-600" />
              <h2 className="text-lg font-semibold text-stone-900">Style constraints</h2>
            </div>

            <div className="grid gap-5">
              <div>
                <span className="mb-3 block text-sm font-medium text-stone-700">Occasion and goal</span>
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
                    <span className="text-sm font-medium text-stone-700">Main goal</span>
                    <input
                      type="text"
                      value={data.goals}
                      onChange={(event) => onChange({ goals: event.target.value })}
                      placeholder="What should this style direction solve?"
                      className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm font-medium text-stone-700">Lifestyle and constraints</span>
                    <textarea
                      value={data.lifestyle}
                      onChange={(event) => onChange({ lifestyle: event.target.value })}
                      placeholder="Work context, commute, fabrics, silhouette preferences, comfort needs."
                      className="min-h-32 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
                    />
                  </label>
                </div>
              </div>

              <div>
                <span className="mb-3 block text-sm font-medium text-stone-700">Budget level</span>
                <div className="flex flex-wrap gap-2">
                  {budgetOptions.map((option) => (
                    <button key={option} type="button" onClick={() => onChange({ budget: option })} className={selectButtonClass(data.budget === option)}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-stone-700">Budget cap</span>
                <input
                  type="text"
                  value={data.budgetCap}
                  onChange={(event) => onChange({ budgetCap: event.target.value })}
                  placeholder="Example: 350 total, or 120 per item"
                  className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
                />
              </label>

              <div>
                <span className="mb-3 block text-sm font-medium text-stone-700">Climate</span>
                <div className="flex flex-wrap gap-2">
                  {climateOptions.map((option) => (
                    <button key={option} type="button" onClick={() => onChange({ climate: option })} className={selectButtonClass(data.climate === option)}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-3 block text-sm font-medium text-stone-700">Dress code</span>
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
                  <span className="text-sm font-medium text-stone-700">Preferred colors</span>
                  <input
                    type="text"
                    value={data.preferredColors}
                    onChange={(event) => onChange({ preferredColors: event.target.value })}
                    placeholder="Navy, olive, monochrome, warm neutrals"
                    className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-sm font-medium text-stone-700">Avoid colors</span>
                  <input
                    type="text"
                    value={data.avoidColors}
                    onChange={(event) => onChange({ avoidColors: event.target.value })}
                    placeholder="Neon, pastel pink, bright orange"
                    className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
                  />
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-stone-700">Brands to avoid</span>
                <input
                  type="text"
                  value={data.avoidBrands}
                  onChange={(event) => onChange({ avoidBrands: event.target.value })}
                  placeholder="Fast fashion only, synthetic-heavy brands, no luxury labels"
                  className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none transition focus:border-teal-400 focus:bg-white focus:ring-2 focus:ring-teal-100"
                />
              </label>
            </div>
          </div>

        </section>
      </div>

      <div className="mt-12 flex flex-col items-center justify-center text-center">
        <p className="max-w-md text-sm text-stone-500 mb-4">
          The first pass builds three distinct looks, a best-fit recommendation, wardrobe reuse guidance, and reusable shopping suggestions.
        </p>
        <button
          onClick={onGenerate}
          disabled={data.userPhotos.length < 1}
          className="inline-flex items-center justify-center px-10 py-4 border border-transparent text-lg font-medium rounded-full text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-teal-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Sparkles className="mr-2 h-5 w-5" />
          Generate style collection
        </button>
      </div>
    </div>
  );
};
