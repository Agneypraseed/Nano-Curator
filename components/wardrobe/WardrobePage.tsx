import React, { useMemo, useState } from 'react';
import { Check, FolderHeart, Layers3, Loader2, ScanSearch, Sparkles, Trash2, WandSparkles } from 'lucide-react';
import Button from '../Button';
import { ImageUploader } from '../ImageUploader';
import { AIProvider, WardrobeCategory, WardrobeItem } from '../../types';

interface Props {
  wardrobeLibrary: WardrobeItem[];
  provider: AIProvider;
  model: string;
  onAddWardrobeItem: (base64: string) => Promise<WardrobeItem[]>;
  onRemoveWardrobeItem: (itemId: string) => void;
  onPlanSuggestion: (selectedPhotos: string[]) => void;
  onNavigateHome: () => void;
}

type Filter = 'all' | WardrobeCategory;
const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'All' }, { value: 'tops', label: 'Tops' },
  { value: 'outerwear', label: 'Jackets' }, { value: 'bottoms', label: 'Bottoms' },
  { value: 'dresses', label: 'Dresses' }, { value: 'accessories', label: 'Accessories' },
  { value: 'shoes', label: 'Shoes' },
];
const imageSource = (image: string) => image.startsWith('data:') ? image : 'data:image/png;base64,' + image;

const WARDROBE_EXAMPLE = {
  source: '/examples/wardrobe/source-outfit.png',
  pieces: [
    { image: '/examples/wardrobe/extracted-piece-1.png', label: 'Lavender polo', category: 'Top' },
    { image: '/examples/wardrobe/extracted-piece-2.png', label: 'Navy trousers', category: 'Bottom' },
    { image: '/examples/wardrobe/extracted-piece-3.png', label: 'Long-sleeve polo', category: 'Top variation' },
  ],
};

export const WardrobePage: React.FC<Props> = ({
  wardrobeLibrary, provider, model, onAddWardrobeItem, onRemoveWardrobeItem, onPlanSuggestion,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<Filter>('all');
  const [isExtracting, setIsExtracting] = useState(false);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [lastImportCount, setLastImportCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedItems = useMemo(() => wardrobeLibrary.filter((item) => selectedIds.includes(item.id)), [selectedIds, wardrobeLibrary]);
  const filteredItems = useMemo(() => activeFilter === 'all' ? wardrobeLibrary : wardrobeLibrary.filter((item) => item.category === activeFilter), [activeFilter, wardrobeLibrary]);
  const categoryCount = (filter: Filter) => filter === 'all' ? wardrobeLibrary.length : wardrobeLibrary.filter((item) => item.category === filter).length;

  const handleUploadOutfit = async (base64: string) => {
    setSourcePreview(base64);
    setIsExtracting(true);
    setLastImportCount(null);
    setError(null);
    try {
      const extracted = await onAddWardrobeItem(base64);
      setSelectedIds((current) => Array.from(new Set([...current, ...extracted.map((item) => item.id)])));
      setLastImportCount(extracted.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The outfit could not be separated into garments.');
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleItem = (itemId: string) => setSelectedIds((current) =>
    current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId]
  );
  const removeItem = (item: WardrobeItem) => {
    onRemoveWardrobeItem(item.id);
    setSelectedIds((current) => current.filter((id) => id !== item.id));
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[2rem] border border-stone-200 bg-[#f4efe6]">
        <div className="grid min-h-[360px] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col justify-between p-7 sm:p-10">
            <div>
              <div className="mb-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                <FolderHeart className="h-4 w-4 text-teal-700" /> AI wardrobe
              </div>
              <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.04em] text-stone-950 sm:text-5xl">Your clothes, extracted and organized.</h1>
              <p className="mt-5 max-w-xl text-sm leading-6 text-stone-600 sm:text-base">Upload one outfit photo. The model inventories every visible garment, rebuilds clean product cutouts, and files them into your wardrobe.</p>
            </div>
            <div className="mt-8 flex flex-wrap gap-2 text-xs text-stone-600">
              <span className="rounded-full border border-stone-300 bg-white/70 px-3 py-1.5 capitalize">{provider}</span>
              <span className="max-w-[240px] truncate rounded-full border border-stone-300 bg-white/70 px-3 py-1.5">{model}</span>
            </div>
          </div>

          <div className="grid min-h-[320px] place-items-center border-t border-stone-200 bg-white/60 p-6 lg:border-l lg:border-t-0">
            {sourcePreview ? (
              <div className="grid w-full max-w-2xl grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
                <div className="overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 shadow-sm">
                  <img src={imageSource(sourcePreview)} alt="Uploaded outfit" className="aspect-[3/4] h-full w-full object-cover" />
                </div>
                <div className="flex flex-col items-center gap-2">
                  {isExtracting ? <Loader2 className="h-6 w-6 animate-spin text-teal-700" /> : <WandSparkles className="h-6 w-6 text-teal-700" />}
                  <span className="hidden h-16 w-px bg-stone-300 sm:block" />
                </div>
                <div className="flex aspect-[3/4] flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white p-5 text-center">
                  {isExtracting ? <>
                    <ScanSearch className="h-8 w-8 animate-pulse text-teal-700" />
                    <p className="mt-4 text-sm font-semibold text-stone-900">Finding every garment</p>
                    <p className="mt-1 text-xs leading-5 text-stone-500">Inventorying layers, then creating each cutout. This can take a few minutes.</p>
                  </> : <>
                    <Layers3 className="h-8 w-8 text-teal-700" />
                    <p className="mt-4 text-sm font-semibold text-stone-900">{lastImportCount === null ? 'Ready for another outfit' : lastImportCount + ' pieces extracted'}</p>
                    <div className="mt-4 w-full"><ImageUploader onImageSelected={handleUploadOutfit} compact label="Import another outfit" /></div>
                  </>}
                </div>
              </div>
            ) : (
              <div className="w-full max-w-md text-center">
                <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-stone-950 text-white"><ScanSearch className="h-6 w-6" /></div>
                <p className="text-lg font-semibold text-stone-950">Import an outfit photo</p>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-500">A clear full-body or flat-lay photo works best when garment edges and layers are visible.</p>
                <div className="mt-6"><ImageUploader onImageSelected={handleUploadOutfit} compact label="Choose outfit photo" /></div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-[2rem] border border-stone-200 bg-white p-5 shadow-[0_18px_50px_-42px_rgba(28,25,23,0.45)] sm:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">How it works</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">One outfit photo becomes an organized wardrobe.</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-stone-500">The AI identifies visible garments, creates clean catalog-style previews, and lets you review each piece before styling it.</p>
        </div>

        <div className="group relative mx-auto mt-6 aspect-[4/3] max-w-4xl overflow-hidden rounded-2xl bg-stone-100">
          <img src={WARDROBE_EXAMPLE.source} alt="Example uploaded outfit" className="h-full w-full object-cover" />
          <div className="absolute inset-0 grid grid-cols-3 gap-2 bg-[#f5f1e9]/95 p-4 opacity-0 backdrop-blur-sm transition duration-300 group-hover:opacity-100 sm:gap-4 sm:p-6">
            {WARDROBE_EXAMPLE.pieces.map((piece) => <img key={piece.image} src={piece.image} alt={piece.label} className="h-full min-h-0 w-full rounded-xl bg-white object-contain p-1 shadow-sm sm:p-3" />)}
          </div>
          <span className="absolute bottom-3 left-3 rounded-full bg-stone-950/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">Hover to preview extraction</span>
        </div>
      </section>

      {provider === 'local' && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Your local endpoint is configured for virtual try-on, not garment extraction. Select OpenAI or Gemini before importing an outfit.</div>}
      {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <section className="mt-12">
        <div className="flex flex-col justify-between gap-5 border-b border-stone-200 pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">Collection</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">Extracted wardrobe</h2>
          </div>
          {selectedItems.length > 0 && <Button onClick={() => onPlanSuggestion(selectedItems.map((item) => item.image))} className="gap-2 rounded-full px-6"><Sparkles className="h-4 w-4" />Style {selectedItems.length} selected</Button>}
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
          {FILTERS.map((filter) => {
            const active = activeFilter === filter.value;
            return <button key={filter.value} type="button" onClick={() => setActiveFilter(filter.value)} className={'whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition ' + (active ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400')}>
              {filter.label} <span className={active ? 'text-stone-300' : 'text-stone-400'}>{categoryCount(filter.value)}</span>
            </button>;
          })}
        </div>

        {filteredItems.length > 0 ? (
          <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filteredItems.map((item) => {
              const selected = selectedIds.includes(item.id);
              const hasCutout = Boolean(item.sourceImage && item.cutoutReady !== false && item.image !== item.sourceImage);
              return <article key={item.id} className={'group relative overflow-hidden rounded-2xl border bg-white transition hover:-translate-y-0.5 hover:shadow-lg ' + (selected ? 'border-teal-600 ring-2 ring-teal-100' : 'border-stone-200')}>
                <button type="button" onClick={() => toggleItem(item.id)} className="block w-full text-left">
                  <div className="relative aspect-square overflow-hidden bg-[#f5f1e9]">
                    <img
                      src={imageSource(hasCutout ? item.sourceImage! : item.image)}
                      alt={hasCutout ? 'Source outfit for ' + item.label : item.label}
                      className={'h-full w-full transition duration-300 ' + (hasCutout ? 'object-cover group-hover:opacity-0' : 'object-contain p-4 group-hover:scale-[1.03]')}
                    />
                    {hasCutout && <img src={imageSource(item.image)} alt={item.label} className="absolute inset-0 h-full w-full object-contain p-4 opacity-0 transition duration-300 group-hover:opacity-100" />}
                    {hasCutout && <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-stone-950/75 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm transition group-hover:bg-teal-700">Hover to isolate</span>}
                    {item.cutoutReady === false && <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800">Detected � cutout pending</span>}
                    <span className={'absolute left-3 top-3 grid h-8 w-8 place-items-center rounded-full border text-white transition ' + (selected ? 'border-teal-600 bg-teal-600' : 'border-white/70 bg-stone-950/35 opacity-0 group-hover:opacity-100')}><Check className="h-4 w-4" /></span>
                  </div>
                  <div className="p-4"><p className="truncate text-sm font-semibold text-stone-900">{item.label}</p><p className="mt-1 text-xs capitalize text-stone-500">{item.category} / {item.provider}</p></div>
                </button>
                <button type="button" onClick={() => removeItem(item)} className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-stone-500 opacity-0 shadow-sm transition hover:bg-red-600 hover:text-white group-hover:opacity-100" aria-label={'Delete ' + item.label}><Trash2 className="h-4 w-4" /></button>
              </article>;
            })}
          </div>
        ) : (
          <div className="mt-7 rounded-[2rem] border border-dashed border-stone-300 bg-white py-16 text-center">
            <Layers3 className="mx-auto h-8 w-8 text-stone-300" />
            <p className="mt-4 text-sm font-semibold text-stone-700">{wardrobeLibrary.length ? 'No pieces in this category yet.' : 'Your extracted pieces will appear here.'}</p>
          </div>
        )}
      </section>
    </div>
  );
};
