import { useState } from 'react';
import { ArrowRight, Check, ChevronDown, Scissors, ShoppingBag, Sparkles, X } from 'lucide-react';
import { type ReferenceTab, type WardrobeItem, type WizardState } from '../../types';
import { imageSource } from '../../utils/imageSource';
import Button from '../Button';
import { ErrorMessage } from '../ErrorMessage';
import { ImageUploader } from '../ImageUploader';
import { PageIntro } from '../PageIntro';

interface ProfileWizardProps {
  data: WizardState;
  error: string | null;
  isGenerating: boolean;
  isProviderConfigured: boolean;
  activeReferenceTab: ReferenceTab;
  onActiveReferenceTabChange: (tab: ReferenceTab) => void;
  onChange: (patch: Partial<WizardState>) => void;
  onAddUserPhoto: (base64: string) => void;
  onRemoveUserPhoto: (index: number) => void;
  wardrobeLibrary: WardrobeItem[];
  onNavigateWardrobe: () => void;
  onOpenModelSettings: () => void;
  onGenerate: () => void;
}

const occasions = ['Interview', 'Wedding guest', 'Creative office', 'Capsule wardrobe', 'Date night', 'Conference'];
const budgets = ['thrift', 'mid-range', 'premium', 'mixed'] as const;
const climates = ['hot', 'mild', 'cool', 'cold', 'variable'] as const;
const dressCodes = ['casual', 'smart-casual', 'business-casual', 'business-formal', 'event-ready'] as const;

const toggleClass = (active: boolean) => 'min-h-10 rounded-md border px-3 py-2 text-sm font-medium transition-colors ' +
  (active ? 'border-plum-700 bg-plum-700 text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-plum-600 hover:text-plum-800');
const sectionTitle = 'section-title text-2xl';
const fieldLabel = 'grid min-w-0 gap-1.5 text-sm font-semibold text-stone-800';

function ChoiceGroup<T extends string>({ label, options, value, onChange }: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-sm font-semibold text-stone-800">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option} type="button" aria-pressed={option === value} className={toggleClass(option === value)} onClick={() => onChange(option)}>
            {option.replaceAll('-', ' ').replace(/^./, (letter) => letter.toUpperCase())}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function PhotoPreview({ image, label, onRemove, square = false }: {
  image: string;
  label: string;
  onRemove: () => void;
  square?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
      <img src={imageSource(image)} alt={label} className={square ? 'aspect-square w-full object-cover' : 'h-48 w-full object-contain'} />
      <button
        type="button"
        onClick={onRemove}
        aria-label={'Remove ' + label.toLowerCase()}
        className="absolute top-1.5 right-1.5 grid size-9 place-items-center rounded-md bg-stone-950/85 text-white hover:bg-stone-950"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function ProfileWizard({
  data, error, isGenerating, isProviderConfigured, activeReferenceTab, onActiveReferenceTabChange, onChange, onAddUserPhoto,
  onRemoveUserPhoto, wardrobeLibrary, onNavigateWardrobe, onOpenModelSettings, onGenerate,
}: ProfileWizardProps) {
  const [source, setSource] = useState<'garment' | 'wardrobe'>(data.wardrobePhotos.length ? 'wardrobe' : 'garment');
  const needsPhoto = data.userPhotos.length === 0;

  return (
    <div className="studio-shell py-6 pb-16 sm:py-9 sm:pb-20">
      <PageIntro title="Style brief" description="Tell Nano Curator what you’re dressing for and how you like to style it." />

      {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"><ErrorMessage message={error} /></div>}

      <form
        className="grid items-start gap-5 lg:grid-cols-[0.91fr_1.09fr] lg:gap-6"
        onSubmit={(event) => { event.preventDefault(); onGenerate(); }}
      >
        <div className="grid min-w-0 gap-5">
          <section className="studio-panel p-4 sm:p-6" aria-labelledby="brief-photos">
            <div className="flex items-center justify-between gap-4">
              <h2 id="brief-photos" className={sectionTitle}>Photos of me</h2>
              <span className="shrink-0 text-sm text-stone-600" aria-label={data.userPhotos.length + ' of 5 photos'}>{data.userPhotos.length} / 5</span>
            </div>
            <p className="mt-2 mb-4 text-sm leading-relaxed text-stone-600">Add at least one clear photo for personalized looks and try-on previews.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {data.userPhotos.map((photo, index) => (
                <PhotoPreview key={index} image={photo} label={'Photo ' + (index + 1)} square onRemove={() => onRemoveUserPhoto(index)} />
              ))}
              {data.userPhotos.length < 5 && <ImageUploader onImageSelected={onAddUserPhoto} compact label="Add a photo of me" />}
            </div>
          </section>

          <section className="studio-panel p-4 sm:p-6" aria-labelledby="brief-garments">
            <h2 id="brief-garments" className={sectionTitle}>Garment and wardrobe</h2>
            <div className="my-4 grid grid-cols-2 gap-2" role="group" aria-label="Clothing sources">
              <button type="button" aria-pressed={source === 'garment'} className={toggleClass(source === 'garment')} onClick={() => setSource('garment')}>Garment</button>
              <button type="button" aria-pressed={source === 'wardrobe'} className={toggleClass(source === 'wardrobe')} onClick={() => setSource('wardrobe')}>
                Wardrobe{data.wardrobePhotos.length > 0 && ' (' + data.wardrobePhotos.length + ')'}
              </button>
            </div>
            {source === 'garment' ? (
              <>
                <p className="mb-4 text-sm leading-relaxed text-stone-600">Add the exact piece you want to try on. Local virtual try-on uses this photo.</p>
                {data.garmentImage
                  ? <PhotoPreview image={data.garmentImage} label="Target garment" onRemove={() => onChange({ garmentImage: null })} />
                  : <ImageUploader onImageSelected={(garmentImage) => onChange({ garmentImage })} label="Add a garment photo" />}
              </>
            ) : (
              <>
                <p className="mb-3 text-sm leading-relaxed text-stone-600">{wardrobeLibrary.length ? 'Choose pieces to reuse in your looks.' : 'Your wardrobe is empty. Import an outfit to start adding pieces.'}</p>
                {wardrobeLibrary.length > 0 && (
                  <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {wardrobeLibrary.map((item) => {
                      const selected = data.wardrobePhotos.includes(item.image);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => onChange({
                            wardrobePhotos: selected ? data.wardrobePhotos.filter((photo) => photo !== item.image) : [...data.wardrobePhotos, item.image],
                          })}
                          className="relative overflow-hidden rounded-md border border-stone-300 bg-stone-50 text-left hover:border-plum-600 aria-pressed:border-plum-700 aria-pressed:ring-1 aria-pressed:ring-plum-700"
                        >
                          <img src={imageSource(item.image)} alt="" loading="lazy" className="aspect-square w-full object-contain p-2" />
                          {selected && <Check className="absolute top-2 right-2 size-5 rounded-sm bg-plum-700 p-0.5 text-white" aria-hidden="true" />}
                          <span className="block border-t border-stone-200 p-2 text-xs font-semibold break-words">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                <Button variant="outline" onClick={onNavigateWardrobe}>
                  Open wardrobe <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </>
            )}
          </section>

          <details className="studio-panel group">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <span className={sectionTitle}>Style inspiration</span>
              <ChevronDown className="size-5 shrink-0 text-plum-700 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="border-t border-stone-200 p-4 sm:p-6">
              <p className="mb-4 text-sm leading-relaxed text-stone-600">Share a reference for the overall aesthetic. Use a garment photo to try on a specific piece.</p>
              <div className="mb-4 grid grid-cols-2 gap-2" role="group" aria-label="Inspiration source">
                <button type="button" className={toggleClass(activeReferenceTab === 'image')} aria-pressed={activeReferenceTab === 'image'} onClick={() => onActiveReferenceTabChange('image')}>Upload image</button>
                <button type="button" className={toggleClass(activeReferenceTab === 'url')} aria-pressed={activeReferenceTab === 'url'} onClick={() => onActiveReferenceTabChange('url')}>Paste link</button>
              </div>
              {activeReferenceTab === 'image' ? (
                data.referenceImage
                  ? <PhotoPreview image={data.referenceImage} label="Reference photo" onRemove={() => onChange({ referenceImage: null })} />
                  : <ImageUploader onImageSelected={(referenceImage) => onChange({ referenceImage })} label="Add an inspiration photo" />
              ) : (
                <label className={fieldLabel}>Reference link
                  <input type="url" className="studio-field" placeholder="https://…" value={data.referenceUrl} onChange={(event) => onChange({ referenceUrl: event.target.value })} />
                </label>
              )}
            </div>
          </details>
        </div>

        <div className="grid min-w-0 gap-5">
          <section className="studio-panel grid gap-5 p-4 sm:p-6" aria-labelledby="brief-preferences">
            <h2 id="brief-preferences" className={sectionTitle}>Occasion and preferences</h2>
            <div className={fieldLabel}>
              <label htmlFor="brief-occasion">Occasion</label>
              <select id="brief-occasion" className="studio-field" value={data.occasion} onChange={(event) => onChange({ occasion: event.target.value })}>
                {!occasions.includes(data.occasion) && <option value={data.occasion}>{data.occasion || 'Select an occasion'}</option>}
                {occasions.map((occasion) => <option key={occasion}>{occasion}</option>)}
              </select>
            </div>
            <label className={fieldLabel}>Main goal
              <input className="studio-field" value={data.goals} onChange={(event) => onChange({ goals: event.target.value })} placeholder="e.g. Feel polished and comfortable at an interview" />
            </label>
            <label className={fieldLabel}>Lifestyle and constraints
              <textarea className="studio-field min-h-24 resize-y" value={data.lifestyle} onChange={(event) => onChange({ lifestyle: event.target.value })} placeholder="Work context, commute, fabrics or fit preferences" />
            </label>
            <ChoiceGroup label="Dress code" options={dressCodes} value={data.dressCode} onChange={(dressCode) => onChange({ dressCode })} />
            <ChoiceGroup label="Budget level" options={budgets} value={data.budget} onChange={(budget) => onChange({ budget })} />
            <label className={fieldLabel}>Budget cap
              <input className="studio-field" value={data.budgetCap} onChange={(event) => onChange({ budgetCap: event.target.value })} placeholder="e.g. €350 total or €120 per item" />
            </label>

            <details className="group border-t border-stone-200 pt-2">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-plum-800">
                Weather, colors and brands
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="grid gap-4 pt-3">
                <ChoiceGroup label="Climate" options={climates} value={data.climate} onChange={(climate) => onChange({ climate })} />
                <label className={fieldLabel}>Location
                  <input className="studio-field" value={data.location} onChange={(event) => onChange({ location: event.target.value })} placeholder="e.g. Berlin, Germany" />
                </label>
                <ChoiceGroup label="Weather mode" options={['auto', 'manual'] as const} value={data.weatherMode} onChange={(weatherMode) => onChange({ weatherMode })} />
                {data.weatherMode === 'manual' && (
                  <label className={fieldLabel}>Weather notes
                    <input className="studio-field" value={data.weatherNotes} onChange={(event) => onChange({ weatherNotes: event.target.value })} placeholder="e.g. Cool mornings and afternoon rain" />
                  </label>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={fieldLabel}>Preferred colors
                    <input className="studio-field" value={data.preferredColors} onChange={(event) => onChange({ preferredColors: event.target.value })} placeholder="e.g. Navy, olive" />
                  </label>
                  <label className={fieldLabel}>Colors to avoid
                    <input className="studio-field" value={data.avoidColors} onChange={(event) => onChange({ avoidColors: event.target.value })} placeholder="e.g. Bright orange" />
                  </label>
                </div>
                <label className={fieldLabel}>Brands to avoid
                  <input className="studio-field" value={data.avoidBrands} onChange={(event) => onChange({ avoidBrands: event.target.value })} />
                </label>
              </div>
            </details>

            <div className="grid gap-2 border-t border-stone-200 pt-4">
              <h2 className={sectionTitle}>Output options</h2>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
                <input type="checkbox" checked={data.includeHaircut} onChange={(event) => onChange({ includeHaircut: event.target.checked })} className="size-4" />
                <Scissors className="size-4 text-plum-700" aria-hidden="true" /> Include haircut direction
              </label>
              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
                <input type="checkbox" checked={data.findOutfits} onChange={(event) => onChange({ findOutfits: event.target.checked })} className="size-4" />
                <ShoppingBag className="size-4 text-plum-700" aria-hidden="true" /> Find purchasable products
              </label>
            </div>
          </section>

          {!isProviderConfigured && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <p>{data.backend === 'local' ? 'Add your local endpoints to generate looks.' : 'Add an API key to generate looks.'}</p>
              <Button variant="outline" onClick={onOpenModelSettings}>Open Model settings</Button>
            </div>
          )}
          <div className="grid gap-2">
            <Button type="submit" disabled={needsPhoto || !isProviderConfigured} isLoading={isGenerating} loadingLabel="Preparing your collection" className="min-h-12 text-base">
              <Sparkles className="size-5" aria-hidden="true" /> Generate style collection
            </Button>
            <p className="text-center text-sm text-stone-600" aria-live="polite">
              {needsPhoto ? 'Add a photo of yourself to continue.' : 'Your collection includes three looks and a primary recommendation.'}
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
