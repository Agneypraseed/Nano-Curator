import { useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, Layers3, LoaderCircle, Search, Sparkles, Trash2 } from 'lucide-react';
import type { AIProvider, ShoppingItem, WardrobeCategory, WardrobeExtractor, WardrobeItem, WardrobeSearchMethod } from '../../types';
import { imageSource } from '../../utils/imageSource';
import { providerLabels } from '../../utils/providers';
import Button from '../Button';
import { ErrorMessage } from '../ErrorMessage';
import { ImageUploader } from '../ImageUploader';
import { PageIntro } from '../PageIntro';
import { WardrobeSearchDialog } from './WardrobeSearchDialog';

interface WardrobePageProps {
  wardrobeLibrary: WardrobeItem[];
  provider: AIProvider;
  model: string;
  isProviderConfigured: boolean;
  canUseMetaSam: boolean;
  canUseLens: boolean;
  onAddWardrobeItem: (base64: string, extractor: WardrobeExtractor, targetGarment: string) => Promise<{ items: WardrobeItem[]; saved: boolean; skippedCount?: number }>;
  onRemoveWardrobeItem: (itemId: string) => boolean;
  onPlanSuggestion: (selectedPhotos: string[]) => void;
  onOpenModelSettings: () => void;
  onSearch: (method: WardrobeSearchMethod, query: string, image?: string) => Promise<ShoppingItem[]>;
}

type CategoryFilter = 'all' | WardrobeCategory;

const filters: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'tops', label: 'Tops' },
  { value: 'outerwear', label: 'Jackets' },
  { value: 'bottoms', label: 'Bottoms' },
  { value: 'dresses', label: 'Dresses' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'other', label: 'Other' },
];

const examplePieces = [
  { image: '/examples/wardrobe/extracted-piece-1.png', label: 'Lavender polo' },
  { image: '/examples/wardrobe/extracted-piece-2.png', label: 'Navy trousers' },
  { image: '/examples/wardrobe/extracted-piece-3.png', label: 'Long-sleeve polo' },
];

function WardrobePiece({ item, selected, onSelect, onRemove, onSearch }: {
  item: WardrobeItem;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onSearch: () => void;
}) {
  const [showSource, setShowSource] = useState(false);
  const hasCutout = Boolean(item.sourceImage && item.cutoutReady !== false && item.image !== item.sourceImage);
  const useSource = hasCutout && showSource;

  return (
    <article className={'relative min-w-0 overflow-hidden rounded-lg border bg-white ' +
      (selected ? 'border-plum-700 ring-1 ring-plum-700' : 'border-stone-300 hover:border-plum-500')}>
      <button type="button" aria-pressed={selected} aria-label={'Select ' + item.label} onClick={onSelect} className="block w-full rounded-lg text-left focus-visible:-outline-offset-4">
        <div className="relative aspect-[5/4] overflow-hidden bg-stone-100">
          <img
            src={imageSource(useSource ? item.sourceImage! : item.image)}
            alt={useSource ? 'Source outfit for ' + item.label : item.label}
            loading="lazy"
            className={'h-full w-full ' + (useSource ? 'object-cover' : 'object-contain p-2.5')}
          />
          <span className={'absolute top-2 left-2 grid size-6 place-items-center rounded-sm border ' +
            (selected ? 'border-plum-700 bg-plum-700 text-white' : 'border-stone-500 bg-white text-stone-700')} aria-hidden="true">
            {selected && <Check className="size-4" />}
          </span>
        </div>
        <div className="border-t border-stone-200 px-2.5 py-2">
          <p className="break-words text-sm font-semibold">{item.label}</p>
          <p className="mt-0.5 text-xs capitalize text-stone-600">
            {item.category}{item.extractor === 'meta-sam' && ' · SAM cutout'}{item.cutoutReady === false && ' · Cutout pending'}
          </p>
        </div>
      </button>
      <button type="button" aria-label={'Delete ' + item.label} onClick={onRemove} className="absolute top-1 right-1 grid size-10 place-items-center rounded-md bg-white text-stone-700 hover:bg-red-50 hover:text-red-800">
        <Trash2 className="size-4" aria-hidden="true" />
      </button>
      <div className="flex flex-wrap justify-between border-t border-stone-200">
        {hasCutout && (
          <button type="button" aria-pressed={showSource} onClick={() => setShowSource((visible) => !visible)} className="min-h-11 px-2.5 text-left text-xs font-semibold text-plum-700 hover:bg-plum-50">
            Show source outfit
          </button>
        )}
        <button type="button" onClick={onSearch} aria-label={'Find similar to ' + item.label} className="inline-flex min-h-11 items-center gap-1.5 px-2.5 text-xs font-semibold text-plum-700 hover:bg-plum-50">
          <Search className="size-3.5" aria-hidden="true" /> Find similar
        </button>
      </div>
    </article>
  );
}

export function WardrobePage({
  wardrobeLibrary, provider, model, isProviderConfigured, canUseMetaSam, canUseLens, onAddWardrobeItem,
  onRemoveWardrobeItem, onPlanSuggestion, onOpenModelSettings, onSearch,
}: WardrobePageProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');
  const [isExtracting, setIsExtracting] = useState(false);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [lastImportCount, setLastImportCount] = useState<number | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);
  const [storageError, setStorageError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractionChoice, setExtractionChoice] = useState<WardrobeExtractor | null>(null);
  const [targetGarment, setTargetGarment] = useState('');
  const [searchItem, setSearchItem] = useState<WardrobeItem | null>(null);
  const extracting = useRef(false);

  const selectedItems = wardrobeLibrary.filter((item) => selectedIds.includes(item.id));
  const filteredItems = activeFilter === 'all' ? wardrobeLibrary : wardrobeLibrary.filter((item) => item.category === activeFilter);
  const extractor = provider === 'meta' ? 'meta-sam' : extractionChoice || (canUseMetaSam ? 'meta-sam' : 'provider');
  const needsSettings = extractor === 'meta-sam' ? !canUseMetaSam : provider === 'local' || !isProviderConfigured;

  const handleUploadOutfit = async (base64: string) => {
    if (extracting.current) return;
    extracting.current = true;
    setSourcePreview(base64);
    setIsExtracting(true);
    setLastImportCount(null);
    setSkippedCount(0);
    setError(null);
    try {
      const { items, saved, skippedCount } = await onAddWardrobeItem(base64, extractor, targetGarment);
      setSelectedIds((current) => Array.from(new Set([...current, ...items.map((item) => item.id)])));
      setLastImportCount(items.length);
      setSkippedCount(skippedCount || 0);
      if (items.length) setStorageError(!saved);
      setActiveFilter('all');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The outfit could not be separated into garments.');
    } finally {
      extracting.current = false;
      setIsExtracting(false);
    }
  };

  return (
    <div className="studio-shell py-6 pb-16 sm:py-9 sm:pb-20">
      <PageIntro title="Wardrobe" description="Turn your outfit photo into individual pieces, then plan looks with the ones you select." />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.35fr)]">
        <section className="studio-panel p-4 sm:p-6" aria-labelledby="wardrobe-import-title">
          <h2 id="wardrobe-import-title" className="section-title text-2xl">{sourcePreview ? 'Source outfit' : 'Import an outfit'}</h2>
          <p className="mt-2 mb-4 text-sm leading-relaxed text-stone-600">Choose a full-body or flat-lay photo where garment edges are visible.</p>
          {provider !== 'meta' && (canUseMetaSam || extractionChoice) && (
            <div className="mb-4 grid gap-1.5 text-sm font-semibold">
              <label htmlFor="wardrobe-extractor">Extraction method</label>
              <select id="wardrobe-extractor" className="studio-field" value={extractor} disabled={isExtracting} onChange={(event) => setExtractionChoice(event.target.value as WardrobeExtractor)}>
                <option value="meta-sam">Meta SAM 3.1</option>
                <option value="provider">{providerLabels[provider]} model</option>
              </select>
            </div>
          )}
          {extractor === 'meta-sam' && (
            <label className="mb-4 grid gap-1.5 text-sm font-semibold">
              Garment to isolate
              <input className="studio-field" value={targetGarment} maxLength={110} disabled={isExtracting} onChange={(event) => setTargetGarment(event.target.value)} placeholder="e.g. dress or blazer" />
              <span className="text-xs font-normal text-stone-600">Leave blank to isolate visible pieces. Photos are sent to Meta for extraction.</span>
            </label>
          )}
          {sourcePreview && (
            <img src={imageSource(sourcePreview)} alt="Uploaded outfit" className="mb-4 aspect-[4/3] max-h-80 w-full rounded-lg bg-stone-100 object-contain" />
          )}
          {needsSettings ? (
            <div className="grid justify-items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <p>{extractor === 'meta-sam' ? 'Configure a Meta API key to use SAM.' : provider === 'local' ? 'Choose a cloud provider or configure Meta SAM to extract garments.' : 'Add an API key to import outfits.'}</p>
              <Button variant="outline" onClick={onOpenModelSettings}>Open Model settings</Button>
            </div>
          ) : (
            <ImageUploader onImageSelected={handleUploadOutfit} disabled={isExtracting} label={sourcePreview ? 'Import another outfit' : 'Upload outfit photo'} />
          )}
          <p className="mt-3 text-xs leading-relaxed break-words text-stone-600">
            {extractor === 'meta-sam' ? 'Meta SAM 3.1' : [providerLabels[provider], provider !== 'local' && model].filter(Boolean).join(' · ')}
          </p>
          {isExtracting && (
            <p role="status" className="mt-3 flex items-center gap-2 text-sm text-plum-800">
              <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden="true" /> Finding garments and preparing cutouts…
            </p>
          )}
          {lastImportCount !== null && (
            <p role="status" className="mt-3 text-sm font-semibold text-emerald-800">
              {lastImportCount === 1 ? '1 piece added.' : lastImportCount + ' pieces added.'}
            </p>
          )}
          {skippedCount > 0 && <p className="mt-2 text-xs text-stone-600">SAM could not isolate {skippedCount} of the detected pieces.</p>}
          {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"><ErrorMessage message={error} /></div>}
        </section>

        <section className="studio-panel p-4 sm:p-6" aria-labelledby="wardrobe-pieces-title">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="wardrobe-pieces-title" className="section-title text-2xl">Extracted pieces</h2>
            <span aria-live="polite" className="text-sm text-stone-600">{selectedItems.length} selected</span>
          </div>
          {storageError && <p role="alert" className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-950">Browser storage could not save these changes. This wardrobe will reset to the last saved version after you refresh.</p>}
          <div className="my-4 flex flex-wrap gap-2" role="group" aria-label="Filter wardrobe by category">
            {filters.map(({ value, label }) => {
              const count = value === 'all' ? wardrobeLibrary.length : wardrobeLibrary.filter((item) => item.category === value).length;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveFilter(value)}
                  aria-pressed={activeFilter === value}
                  className="min-h-10 rounded-md border border-stone-300 px-2.5 text-xs font-semibold text-stone-700 hover:bg-plum-50 aria-pressed:border-plum-700 aria-pressed:bg-plum-700 aria-pressed:text-white sm:text-sm"
                >
                  {label} <span className="font-normal">{count}</span>
                </button>
              );
            })}
          </div>
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
              {filteredItems.map((item) => (
                <WardrobePiece
                  key={item.id}
                  item={item}
                  selected={selectedIds.includes(item.id)}
                  onSelect={() => setSelectedIds((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])}
                  onRemove={() => {
                    setStorageError(!onRemoveWardrobeItem(item.id));
                    setSelectedIds((current) => current.filter((id) => id !== item.id));
                  }}
                  onSearch={() => setSearchItem(item)}
                />
              ))}
            </div>
          ) : (
            <div className="grid justify-items-center gap-2 rounded-lg border border-dashed border-stone-300 px-4 py-9 text-center">
              <Layers3 className="size-6 text-plum-700" strokeWidth={1.5} aria-hidden="true" />
              <p className="text-sm font-semibold">{wardrobeLibrary.length ? 'No pieces in this category.' : 'Your extracted pieces will appear here.'}</p>
              {!wardrobeLibrary.length && <p className="text-sm text-stone-600">Import a photo to add your first pieces.</p>}
            </div>
          )}
          {wardrobeLibrary.length > 0 && (
            <Button disabled={!selectedItems.length} onClick={() => onPlanSuggestion(selectedItems.map((item) => item.image))} className="mt-5 w-full">
              <Sparkles className="size-4" aria-hidden="true" /> Plan with selected pieces
            </Button>
          )}
        </section>
      </div>

      <details className="studio-panel group mt-5">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <span className="section-title text-2xl">See an extraction example</span>
          <ChevronDown className="size-5 shrink-0 text-plum-700 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="grid gap-4 border-t border-stone-200 p-4 sm:grid-cols-[1fr_auto_3fr] sm:items-start sm:p-6">
          <figure>
            <img src="/examples/wardrobe/source-outfit.png" alt="Example outfit photo" loading="lazy" className="aspect-square w-full rounded-lg bg-stone-100 object-contain" />
            <figcaption className="mt-2 text-sm font-semibold">Source outfit</figcaption>
          </figure>
          <ArrowRight className="hidden size-5 self-center text-plum-700 sm:block" aria-hidden="true" />
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {examplePieces.map(({ image, label }) => (
              <figure key={image}>
                <img src={image} alt="" loading="lazy" className="aspect-square w-full rounded-lg bg-stone-100 object-contain" />
                <figcaption className="mt-2 text-xs font-semibold sm:text-sm">{label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </details>
      {searchItem && <WardrobeSearchDialog item={searchItem} canUseMeta={canUseMetaSam} canUseLens={canUseLens} onClose={() => setSearchItem(null)} onSearch={onSearch} />}
    </div>
  );
}
