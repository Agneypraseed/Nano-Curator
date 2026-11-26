import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Search, X } from 'lucide-react';
import type { ShoppingItem, WardrobeItem, WardrobeSearchMethod } from '../../types';
import { imageSource } from '../../utils/imageSource';
import { productLink } from '../../utils/productLink';
import Button from '../Button';
import { ErrorMessage } from '../ErrorMessage';

interface WardrobeSearchDialogProps {
  item: WardrobeItem;
  canUseMeta: boolean;
  canUseLens: boolean;
  onClose: () => void;
  onSearch: (method: WardrobeSearchMethod, query: string, image?: string) => Promise<ShoppingItem[]>;
}

export function WardrobeSearchDialog({ item, canUseMeta, canUseLens, onClose, onSearch }: WardrobeSearchDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState(item.searchQuery || item.label);
  const [pending, setPending] = useState<WardrobeSearchMethod | null>(null);
  const [results, setResults] = useState<ShoppingItem[] | null>(null);
  const [error, setError] = useState('');
  const hasCutout = item.cutoutReady === true || Boolean(item.cutoutReady !== false && item.sourceImage && item.image !== item.sourceImage);
  const cutout = hasCutout ? item.image : undefined;
  const shoppingUrl = new URL('https://www.google.com/search');
  shoppingUrl.searchParams.set('tbm', 'shop');
  shoppingUrl.searchParams.set('q', query.trim());

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const search = async (method: WardrobeSearchMethod) => {
    if (!query.trim() || pending) return;
    setPending(method);
    setResults(null);
    setError('');
    try {
      setResults(await onSearch(method, query.trim(), cutout));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search could not finish. Try again.');
    } finally {
      setPending(null);
    }
  };

  return (
    <dialog ref={dialog} onClose={onClose} aria-labelledby="wardrobe-search-title" className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-xl border border-stone-300 bg-white p-4 text-stone-950 shadow-xl backdrop:bg-stone-950/45 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <h2 id="wardrobe-search-title" className="section-title text-2xl sm:text-3xl">Find similar pieces</h2>
        <button type="button" onClick={() => dialog.current?.close()} aria-label="Close product search" className="grid size-11 shrink-0 place-items-center rounded-md text-stone-700 hover:bg-plum-50">
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-2 flex items-center gap-3 sm:gap-4">
        {cutout && <img src={imageSource(cutout)} alt={item.label} className="size-16 shrink-0 rounded-md bg-stone-100 object-contain p-1 sm:size-20" />}
        <div className="min-w-0">
          <p className="font-semibold break-words">{item.label}</p>
          {item.description && <p className="mt-1 text-sm leading-relaxed break-words text-stone-600">{item.description}</p>}
        </div>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); if (canUseMeta) void search('meta'); }} className="mt-5 grid gap-3">
        <label className="grid gap-1.5 text-sm font-semibold">Search description
          <input autoFocus className="studio-field" value={query} maxLength={240} required onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {canUseMeta && (
            <Button type="submit" disabled={Boolean(pending) || !query.trim()} isLoading={pending === 'meta'} loadingLabel="Finding similar items">
              <Search className="size-4" aria-hidden="true" /> {cutout ? 'Search image and details' : 'Search details'}
            </Button>
          )}
          {canUseLens && cutout && (
            <Button variant="outline" disabled={Boolean(pending)} onClick={() => void search('lens')} isLoading={pending === 'lens'} loadingLabel="Searching by image">
              Search with Google Lens
            </Button>
          )}
          {query.trim() && <a href={shoppingUrl.href} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-semibold text-plum-700 underline underline-offset-4">
            Google Shopping <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>}
        </div>
        {canUseMeta && <p className="text-xs leading-relaxed text-stone-600">Search sends the description{cutout && ' and garment cutout'} to Meta.</p>}
        {canUseLens && cutout && <p className="text-xs leading-relaxed text-stone-600">Google Lens uses a public copy of the cutout hosted on ImgBB.</p>}
      </form>
      {error && <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800"><ErrorMessage message={error} /></div>}
      {results && (
        <section className="mt-5 border-t border-stone-200 pt-4" aria-labelledby="wardrobe-search-results">
          <h3 id="wardrobe-search-results" className="section-title text-xl">Retailer matches</h3>
          <p className="mt-1 text-sm text-stone-600" role="status">
            {results.length ? results.length + ' possible matches. Check the listing for current price and availability.' : 'No verified product links came back. Edit the description or try Google Shopping.'}
          </p>
          <ul className="mt-3 grid gap-2">
            {results.map((result) => {
              const url = productLink(result.url);
              const thumbnail = productLink(result.thumbnail);
              return url && (
                <li key={url} className="rounded-lg border border-stone-200">
                  <a href={url} target="_blank" rel="noreferrer" className="flex items-start gap-3 rounded-lg p-3 hover:bg-plum-50">
                    {thumbnail && <img src={thumbnail} alt="" className="size-12 shrink-0 rounded-md object-contain" loading="lazy" referrerPolicy="no-referrer" />}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold break-words">{result.name}</span>
                      <span className="block text-xs text-stone-600">{[result.brand, result.priceNote].filter(Boolean).join(' · ')}</span>
                      {result.reason && <span className="mt-1 block text-xs leading-relaxed text-stone-700">{result.reason}</span>}
                    </span>
                    <ArrowUpRight className="size-4 shrink-0 text-plum-700" aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </dialog>
  );
}
