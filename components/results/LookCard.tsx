import React, { useState } from 'react';
import { ExternalLink, Heart, Palette, RefreshCw, Scale, ShoppingBag, WandSparkles } from 'lucide-react';
import Button from '../Button';
import { StyleOption } from '../../types';

interface LookCardProps {
  style: StyleOption;
  image?: string;
  isFavorite: boolean;
  isSelectedForCompare: boolean;
  disableCompare: boolean;
  isRefreshing: boolean;
  activeEditKey: string | null;
  onToggleFavorite: (lookId: string) => void;
  onToggleCompare: (lookId: string) => void;
  onRefreshImage: (lookId: string) => void;
  onTransformLook: (lookId: string, label: string, instruction: string) => void;
}

const QUICK_EDITS = [
  {
    label: 'More formal',
    instruction:
      'Keep the core silhouette and identity of this look, but make it more formal, cleaner, and more presentation-ready.',
  },
  {
    label: 'Change colors',
    instruction:
      'Keep the silhouette and function of this look, but shift the palette toward the user preferred colors and away from the avoided colors.',
  },
  {
    label: 'Lower budget',
    instruction:
      'Keep the overall direction, but rebuild the look around lower-cost pieces and more accessible shopping alternatives.',
  },
];

export const LookCard: React.FC<LookCardProps> = ({
  style,
  image,
  isFavorite,
  isSelectedForCompare,
  disableCompare,
  isRefreshing,
  activeEditKey,
  onToggleFavorite,
  onToggleCompare,
  onRefreshImage,
  onTransformLook,
}) => {
  const [customInstruction, setCustomInstruction] = useState('');

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
      <div className="relative overflow-hidden bg-slate-100">
        {image ? (
          <img src={image} alt={style.title} className="aspect-[3/4] h-full w-full object-cover" />
        ) : (
          <div className="flex aspect-[3/4] items-center justify-center text-sm text-slate-400">Generating image</div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4">
          <div className="rounded-full bg-black/55 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-white backdrop-blur">
            {style.title}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onToggleFavorite(style.id)}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full backdrop-blur transition ${
                isFavorite ? 'bg-rose-500 text-white' : 'bg-white/80 text-slate-700 hover:bg-white'
              }`}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => onToggleCompare(style.id)}
              disabled={disableCompare}
              className={`inline-flex h-10 w-10 items-center justify-center rounded-full backdrop-blur transition ${
                isSelectedForCompare
                  ? 'bg-slate-900 text-white'
                  : 'bg-white/80 text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50'
              }`}
              aria-label={isSelectedForCompare ? 'Remove from compare' : 'Add to compare'}
            >
              <Scale className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-5 p-5">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Look brief</p>
          <p className="text-lg font-semibold text-slate-900">{style.description}</p>
          <p className="text-sm leading-6 text-slate-600">{style.reasoning}</p>
        </div>

        <div className="grid gap-3 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600">
          <div className="flex items-start gap-2">
            <Palette className="mt-0.5 h-4 w-4 text-slate-500" />
            <div className="flex flex-wrap gap-2">
              {style.palette.map((item) => (
                <span key={item} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                  {item}
                </span>
              ))}
            </div>
          </div>
          {style.dressCodeNote && <p>{style.dressCodeNote}</p>}
          {style.weatherNote && <p>{style.weatherNote}</p>}
          {style.wardrobeAnchors.length > 0 && (
            <p>
              Reuse from wardrobe: {style.wardrobeAnchors.join(', ')}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => onRefreshImage(style.id)} isLoading={isRefreshing} loadingLabel="Refreshing image">
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh image
          </Button>
        </div>

        <div className="space-y-3 rounded-3xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <WandSparkles className="h-4 w-4 text-indigo-600" />
            Edit this look
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_EDITS.map((edit) => {
              const editKey = `${style.id}:${edit.label}`;
              return (
                <Button
                  key={edit.label}
                  variant="outline"
                  className="px-3 py-2 text-sm"
                  onClick={() => onTransformLook(style.id, edit.label, edit.instruction)}
                  isLoading={activeEditKey === editKey}
                  loadingLabel={edit.label}
                >
                  {edit.label}
                </Button>
              );
            })}
          </div>
          <div className="grid gap-2">
            <input
              type="text"
              value={customInstruction}
              onChange={(event) => setCustomInstruction(event.target.value)}
              placeholder="Custom tweak, e.g. make this more minimal"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
            />
            <Button
              variant="outline"
              onClick={() => {
                const trimmed = customInstruction.trim();
                if (!trimmed) {
                  return;
                }
                onTransformLook(style.id, 'Custom', trimmed);
                setCustomInstruction('');
              }}
              isLoading={activeEditKey === `${style.id}:Custom`}
              loadingLabel="Applying tweak"
            >
              Apply custom tweak
            </Button>
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-200 pt-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ShoppingBag className="h-4 w-4 text-indigo-600" />
            Shop this look
          </div>

          {style.shoppingItems.length === 0 ? (
            <p className="text-sm text-slate-500">No product matches were attached to this look.</p>
          ) : (
            <div className="grid gap-3">
              {style.shoppingItems.map((item) => (
                <div key={`${style.id}-${item.url}`} className="rounded-3xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.brand}
                        {item.category ? ` - ${item.category}` : ''}
                        {item.priceNote ? ` - ${item.priceNote}` : ''}
                      </p>
                      {item.reason && <p className="mt-2 text-sm text-slate-600">{item.reason}</p>}
                      {item.alternatives && item.alternatives.length > 0 && (
                        <div className="mt-3 space-y-2 rounded-2xl bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Alternatives</p>
                          {item.alternatives.map((alternative) => (
                            <a
                              key={`${item.url}-${alternative.url}`}
                              href={alternative.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block rounded-2xl border border-slate-200 bg-white p-3 text-sm transition hover:border-slate-900"
                            >
                              <div className="font-medium text-slate-900">{alternative.name}</div>
                              <div className="mt-1 text-slate-500">
                                {alternative.brand}
                                {alternative.priceNote ? ` - ${alternative.priceNote}` : ''}
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                      aria-label={`Open ${item.name}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
