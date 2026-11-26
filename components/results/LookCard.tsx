import { useState } from 'react';
import { ArrowLeftRight, ChevronDown, ExternalLink, Heart, ImageOff, RefreshCw, Search, ShoppingBag, WandSparkles } from 'lucide-react';
import Button from '../Button';
import type { StyleOption } from '../../types';
import { productLink } from '../../utils/productLink';

interface LookCardProps {
  style: StyleOption;
  image?: string;
  isFavorite: boolean;
  isSelectedForCompare: boolean;
  disableCompare: boolean;
  isRefreshing: boolean;
  isSearching: boolean;
  activeEditKey: string | null;
  canEdit: boolean;
  busy: boolean;
  onToggleFavorite: (lookId: string) => void;
  onToggleCompare: (lookId: string) => void;
  onRefreshImage: (lookId: string) => void;
  onVisualSearch: (lookId: string) => void;
  onTransformLook: (lookId: string, label: string, instruction: string) => void;
}

const quickEdits = [
  { label: 'More formal', instruction: 'Keep the core silhouette and identity of this look, but make it more formal, cleaner, and more presentation-ready.' },
  { label: 'Change colors', instruction: 'Keep the silhouette and function of this look, but shift the palette toward the user preferred colors and away from the avoided colors.' },
  { label: 'Lower budget', instruction: 'Keep the overall direction, but rebuild the look around lower-cost pieces and more accessible shopping alternatives.' },
];

export function LookCard({
  style, image, isFavorite, isSelectedForCompare, disableCompare, isRefreshing, isSearching,
  activeEditKey, canEdit, busy, onToggleFavorite, onToggleCompare, onRefreshImage, onVisualSearch, onTransformLook,
}: LookCardProps) {
  const [customInstruction, setCustomInstruction] = useState('');

  return (
    <article className="studio-panel overflow-hidden">
      <div className="relative bg-stone-100">
        {image ? (
          <img src={image} alt={style.title} loading="lazy" className="aspect-[4/5] w-full object-cover object-top" />
        ) : (
          <div className="grid aspect-[4/5] place-content-center justify-items-center gap-2 text-sm text-stone-600">
            <ImageOff className="size-5" aria-hidden="true" /> Preview unavailable
          </div>
        )}
        <button
          type="button"
          aria-label={'Favorite ' + style.title}
          aria-pressed={isFavorite}
          onClick={() => onToggleFavorite(style.id)}
          className="absolute top-3 right-3 grid size-11 place-items-center rounded-md border border-stone-200 bg-white text-plum-700 hover:bg-plum-50 aria-pressed:border-plum-700 aria-pressed:bg-plum-700 aria-pressed:text-white"
        >
          <Heart className={'size-5 ' + (isFavorite ? 'fill-current' : '')} aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-4 p-4 sm:p-5">
        <div>
          <h3 className="section-title text-2xl">{style.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-stone-700">{style.description}</p>
        </div>
        <Button
          variant={isSelectedForCompare ? 'primary' : 'outline'}
          aria-pressed={isSelectedForCompare}
          aria-label={'Compare ' + style.title}
          disabled={disableCompare}
          onClick={() => onToggleCompare(style.id)}
          className="justify-self-start"
        >
          <ArrowLeftRight className="size-4" aria-hidden="true" /> {isSelectedForCompare ? 'Selected for comparison' : 'Compare'}
        </Button>
        <details className="group border-t border-stone-200">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-semibold text-stone-900">
            Look details <ChevronDown className="size-4 text-plum-700 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="space-y-3 pb-2 text-sm leading-relaxed text-stone-700">
            <p>{style.reasoning}</p>
            {style.palette.length > 0 && <p><strong>Palette</strong> {style.palette.join(' · ')}</p>}
            {style.dressCodeNote && <p>{style.dressCodeNote}</p>}
            {style.weatherNote && <p>{style.weatherNote}</p>}
            {style.wardrobeAnchors.length > 0 && <p><strong>Wardrobe pieces</strong> {style.wardrobeAnchors.join(', ')}</p>}
          </div>
        </details>
        <details className="group border-t border-stone-200 print:hidden">
          <summary className="grid min-h-11 cursor-pointer list-none grid-cols-[auto_1fr_auto] items-center gap-2 font-semibold text-stone-900">
            <WandSparkles className="size-4 text-plum-700" aria-hidden="true" /> Edit this look
            <ChevronDown className="size-4 text-plum-700 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="grid gap-3 pb-2">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => onRefreshImage(style.id)} disabled={!canEdit || busy} isLoading={isRefreshing} loadingLabel="Refreshing image">
                <RefreshCw className="size-4" aria-hidden="true" /> Refresh image
              </Button>
              {quickEdits.map(({ label, instruction }) => (
                <Button
                  key={label}
                  variant="outline"
                  onClick={() => onTransformLook(style.id, label, instruction)}
                  disabled={!canEdit || busy}
                  isLoading={activeEditKey === style.id + ':' + label}
                  loadingLabel={label}
                >
                  {label}
                </Button>
              ))}
            </div>
            <label className="grid gap-1.5 text-sm font-semibold">Custom tweak
              <input
                className="studio-field"
                value={customInstruction}
                onChange={(event) => setCustomInstruction(event.target.value)}
                placeholder="e.g. Make this more minimal"
              />
            </label>
            <Button
              variant="outline"
              disabled={!canEdit || busy || !customInstruction.trim()}
              isLoading={activeEditKey === style.id + ':Custom'}
              loadingLabel="Applying tweak"
              onClick={() => onTransformLook(style.id, 'Custom', customInstruction.trim())}
              className="justify-self-start"
            >
              Apply custom tweak
            </Button>
          </div>
        </details>
        <details className="group border-t border-stone-200">
          <summary className="grid min-h-11 cursor-pointer list-none grid-cols-[auto_1fr_auto] items-center gap-2 font-semibold text-stone-900">
            <ShoppingBag className="size-4 text-plum-700" aria-hidden="true" /> Shop this look
            <ChevronDown className="size-4 text-plum-700 transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="grid gap-3 pb-2">
            <Button variant="outline" onClick={() => onVisualSearch(style.id)} disabled={!image || busy} isLoading={isSearching} loadingLabel="Finding matches" className="justify-self-start">
              <Search className="size-4" aria-hidden="true" /> Find real products
            </Button>
            {style.shoppingItems.length === 0 && <p className="text-sm text-stone-600">No product suggestions for this look yet.</p>}
            {style.shoppingItems.map((item, index) => {
              const url = productLink(item.url);
              return (
                <div key={item.url || item.name + index} className="rounded-lg border border-stone-200 p-3 text-sm leading-relaxed">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold break-words">{item.name}</p>
                      <p className="text-stone-600">{[item.brand, item.category, item.priceNote].filter(Boolean).join(' · ')}</p>
                    </div>
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={'Open ' + item.name}
                        className="grid size-10 shrink-0 place-items-center rounded-md border border-stone-200 text-plum-700 hover:bg-plum-50"
                      >
                        <ExternalLink className="size-4" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                  {item.reason && <p className="mt-2 text-stone-600">{item.reason}</p>}
                  {Boolean(item.alternatives?.length) && (
                    <ul aria-label="Alternatives" className="mt-2 grid gap-2 border-t border-stone-200 pt-2">
                      {item.alternatives?.map((alternative, index) => {
                        const url = productLink(alternative.url);
                        return (
                          <li key={alternative.url || alternative.name + index}>
                            {url
                              ? <a href={url} target="_blank" rel="noreferrer" className="font-semibold text-plum-800 underline underline-offset-4">{alternative.name}</a>
                              : <p className="font-semibold">{alternative.name}</p>}
                            <p className="text-stone-600">{[alternative.brand, alternative.priceNote].filter(Boolean).join(' · ')}</p>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      </div>
    </article>
  );
}
