import React from 'react';
import {
  AlertCircle,
  ArrowLeftRight,
  Briefcase,
  ClipboardCopy,
  Download,
  Leaf,
  Printer,
  RefreshCw,
  RotateCcw,
  Scissors,
  Share2,
  ImageOff,
  Star,
  CloudSun,
  Shirt,
  X,
} from 'lucide-react';
import Button from '../Button';
import { ErrorMessage } from '../ErrorMessage';
import { PageIntro } from '../PageIntro';
import { productLink } from '../../utils/productLink';
import { LookCard } from './LookCard';
import { SessionRecord, StyleAnalysis, StyleOption } from '../../types';

interface ResultsPageProps {
  analysis: StyleAnalysis;
  styleImages: Record<string, string>;
  haircutImage: string | null;
  favorites: string[];
  compareLookIds: string[];
  refreshingLookId: string | null;
  searchingLookId: string | null;
  editingLookKey: string | null;
  isGeneratingMore: boolean;
  canUpdateLooks: boolean;
  error: string | null;
  notice: string;
  onDismissFeedback: () => void;
  sessions: SessionRecord[];
  onNewSession: () => void;
  onGenerateMore: () => void;
  onToggleFavorite: (lookId: string) => void;
  onToggleCompare: (lookId: string) => void;
  onRefreshImage: (lookId: string) => void;
  onVisualSearch: (lookId: string) => void;
  onTransformLook: (lookId: string, label: string, instruction: string) => void;
  onPrint: () => void;
  onShare: () => void;
  onCopyBrief: () => void;
  onDownloadBrief: () => void;
}

function LookPreview({ image, title, className }: { image?: string; title: string; className: string }) {
  return image
    ? <img src={image} alt={title} className={'w-full bg-stone-100 object-cover ' + className} />
    : <div className={'grid min-h-32 w-full place-content-center justify-items-center gap-2 bg-stone-100 px-3 text-center text-sm text-stone-600 ' + className}>
        <ImageOff className="size-5" aria-hidden="true" /> Preview unavailable
      </div>;
}

const findLook = (styles: StyleOption[], lookId: string) => styles.find((style) => style.id === lookId);

export const ResultsPage: React.FC<ResultsPageProps> = ({
  analysis,
  styleImages,
  haircutImage,
  favorites,
  compareLookIds,
  refreshingLookId,
  searchingLookId,
  editingLookKey,
  isGeneratingMore,
  canUpdateLooks,
  error,
  notice,
  onDismissFeedback,
  sessions,
  onNewSession,
  onGenerateMore,
  onToggleFavorite,
  onToggleCompare,
  onRefreshImage,
  onVisualSearch,
  onTransformLook,
  onPrint,
  onShare,
  onCopyBrief,
  onDownloadBrief,
}) => {
  const bestLook = findLook(analysis.styles, analysis.summary.bestLookId) ?? analysis.styles[0];
  const compareLooks = compareLookIds.map((lookId) => findLook(analysis.styles, lookId)).filter(Boolean) as StyleOption[];
  const favoriteLooks = favorites.map((lookId) => findLook(analysis.styles, lookId)).filter(Boolean) as StyleOption[];
  const isUpdating = Boolean(refreshingLookId || searchingLookId || editingLookKey || isGeneratingMore);
  const totalProducts = analysis.styles.reduce((count, style) => count + style.shoppingItems.length, 0);

  return (
    <div className="studio-shell grid min-w-0 gap-8 py-6 pb-16 sm:py-9 sm:pb-20">
      <div>
        <PageIntro
          title="Your style collection"
          description={analysis.summary.headline}
          action={<Button variant="outline" onClick={onNewSession}><RotateCcw className="size-4" aria-hidden="true" /> New session</Button>}
        />
        <div className="flex flex-wrap items-center gap-2 print:hidden" role="group" aria-label="Export style collection">
          <Button variant="secondary" onClick={onPrint}><Printer className="size-4" aria-hidden="true" /> Print</Button>
          <Button variant="secondary" onClick={onShare}><Share2 className="size-4" aria-hidden="true" /> Share</Button>
          <Button variant="secondary" onClick={onCopyBrief}><ClipboardCopy className="size-4" aria-hidden="true" /> Copy brief</Button>
          <Button variant="secondary" onClick={onDownloadBrief}><Download className="size-4" aria-hidden="true" /> Download brief</Button>
          {compareLooks.length === 2 && (
            <a href="#compare-looks" className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold text-plum-700 hover:bg-plum-50">
              <ArrowLeftRight className="size-4" aria-hidden="true" /> Compare selected looks
            </a>
          )}
        </div>
      </div>
      {(error || notice) && (
        <div className={'fixed inset-x-4 bottom-4 z-10 mx-auto flex max-w-lg items-start gap-2 rounded-lg border p-3 text-sm shadow-lg print:hidden ' +
          (error ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800')}>
          <div className="min-w-0 flex-1 self-center">
            {error ? <ErrorMessage message={error} /> : <p role="status" className="font-semibold">{notice}</p>}
          </div>
          <button type="button" onClick={onDismissFeedback} aria-label="Dismiss message" className="grid size-9 shrink-0 place-items-center rounded-md hover:bg-black/5">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <section className="studio-panel grid overflow-hidden md:grid-cols-[minmax(0,0.65fr)_minmax(0,1fr)]" aria-labelledby="recommendation-title">
        <LookPreview image={bestLook && styleImages[bestLook.id]} title={bestLook?.title || 'Primary recommendation'} className="h-full min-h-55 max-h-100 object-top md:max-h-120" />
        <div className="grid content-center gap-4 p-5 sm:p-8 lg:p-10">
          <p className="text-sm font-semibold text-plum-700">Primary recommendation</p>
          <h2 id="recommendation-title" className="section-title text-3xl sm:text-4xl">{bestLook?.title || analysis.summary.headline}</h2>
          <p className="text-base leading-relaxed text-stone-700">{analysis.summary.bestLookReason}</p>
          {analysis.summary.nextStep && <p className="text-sm leading-relaxed text-stone-700">{analysis.summary.nextStep}</p>}
          {analysis.summary.confidenceNote && (
            <p className="flex items-start gap-2 rounded-md bg-plum-50 p-3 text-sm leading-relaxed text-stone-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-plum-700" aria-hidden="true" />{analysis.summary.confidenceNote}
            </p>
          )}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-stone-200 pt-3 lg:grid-cols-4">
            {[
              { label: 'Face shape', value: analysis.faceShape },
              { label: 'Skin tone', value: analysis.skinTone },
              { label: 'Body analysis', value: analysis.bodyType },
              { label: 'Attached products', value: totalProducts },
            ].map(({ label, value }) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs text-stone-600">{label}</dt>
                <dd className="mt-0.5 break-words text-sm font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title text-3xl">Look set</h2>
            <p className="text-sm text-stone-500">Select two looks to compare their details side by side.</p>
          </div>
          <Button variant="outline" onClick={onGenerateMore} disabled={isUpdating || !canUpdateLooks} isLoading={isGeneratingMore} loadingLabel="Generating more looks">
            <RefreshCw className={`mr-2 h-4 w-4 ${isGeneratingMore ? 'animate-spin' : ''}`} />
            Generate more looks
          </Button>
        </div>

        {!canUpdateLooks && <p className="text-sm text-stone-600">Add a photo and configure a provider in the style brief to generate or edit looks.</p>}
        <div className="grid items-start gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {analysis.styles.map((style) => (
            <LookCard
              key={style.id}
              style={style}
              image={styleImages[style.id]}
              isFavorite={favorites.includes(style.id)}
              isSelectedForCompare={compareLookIds.includes(style.id)}
              disableCompare={!compareLookIds.includes(style.id) && compareLookIds.length >= 2}
              isRefreshing={refreshingLookId === style.id}
              isSearching={searchingLookId === style.id}
              activeEditKey={editingLookKey}
              canEdit={canUpdateLooks}
              busy={isUpdating}
              onToggleFavorite={onToggleFavorite}
              onToggleCompare={onToggleCompare}
              onRefreshImage={onRefreshImage}
              onVisualSearch={onVisualSearch}
              onTransformLook={onTransformLook}
            />
          ))}
        </div>
      </section>

      {compareLooks.length === 2 && (
        <section id="compare-looks" className="scroll-mt-6 rounded-xl border border-stone-200 bg-white p-6">
          <div className="mb-5 flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-stone-500" />
            <h2 className="section-title text-2xl text-stone-900">Compare looks</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {compareLooks.map((look) => (
              <div key={`compare-${look.id}`} className="overflow-hidden rounded-xl border border-stone-200">
                <LookPreview image={styleImages[look.id]} title={look.title} className="aspect-[4/3] max-h-96" />
                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-stone-900">{look.title}</h3>
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">{look.shoppingItems.length} products</span>
                  </div>
                  <p className="text-sm leading-6 text-stone-600">{look.reasoning}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {favoriteLooks.length > 0 && (
        <section className="rounded-xl border border-stone-200 bg-white p-6">
          <div className="mb-5 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            <h2 className="section-title text-2xl text-stone-900">Favorites board</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {favoriteLooks.map((look) => (
              <div key={`favorite-${look.id}`} className="overflow-hidden rounded-xl border border-stone-200">
                <LookPreview image={styleImages[look.id]} title={look.title} className="aspect-[4/5] max-h-80" />
                <div className="p-4">
                  <h3 className="font-semibold text-stone-900">{look.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{look.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(analysis.weatherContext || analysis.wardrobeSummary) && (
        <section className="grid gap-6 lg:grid-cols-2">
          {analysis.weatherContext && analysis.weatherContext.source !== 'none' && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-6">
              <div className="mb-4 flex items-center gap-2">
                <CloudSun className="h-5 w-5 text-sky-700" />
                <h2 className="section-title text-2xl text-stone-900">Weather context</h2>
              </div>
              <div className="space-y-2 text-sm leading-6 text-stone-700">
                <p><span className="font-medium">Source:</span> {analysis.weatherContext.source}</p>
                <p><span className="font-medium">Location:</span> {analysis.weatherContext.location}</p>
                <p><span className="font-medium">Summary:</span> {analysis.weatherContext.summary}</p>
                {analysis.weatherContext.temperatureBand && (
                  <p><span className="font-medium">Temperature band:</span> {analysis.weatherContext.temperatureBand}</p>
                )}
              </div>
              {analysis.weatherContext.stylingNotes.length > 0 && (
                <ul className="mt-4 space-y-2 text-sm text-stone-700">
                  {analysis.weatherContext.stylingNotes.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {analysis.wardrobeSummary && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
              <div className="mb-4 flex items-center gap-2">
                <Shirt className="h-5 w-5 text-amber-700" />
                <h2 className="section-title text-2xl text-stone-900">Wardrobe reuse plan</h2>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-900">Detected pieces</h3>
                  <ul className="space-y-2 text-sm text-stone-700">
                    {analysis.wardrobeSummary.detectedPieces.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-900">Reuse plan</h3>
                  <ul className="space-y-2 text-sm text-stone-700">
                    {analysis.wardrobeSummary.reusePlan.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-900">Gap pieces</h3>
                  <ul className="space-y-2 text-sm text-stone-700">
                    {analysis.wardrobeSummary.gapPieces.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {(analysis.personalBrand || analysis.sustainableAdvice) && <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        {analysis.personalBrand && (
          <div className="rounded-xl border border-stone-200 bg-plum-50 p-6 text-stone-950">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-lg bg-plum-100 p-3">
                <Briefcase className="h-5 w-5 text-plum-700" />
              </div>
              <div>
                <h2 className="section-title text-2xl">Personal brand report</h2>
                <p className="text-sm text-stone-400">{analysis.personalBrand.archetype}</p>
              </div>
            </div>
            <p className="mb-6 text-sm leading-7 text-stone-700">{analysis.personalBrand.strategicSummary}</p>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-plum-700">Industry</h3>
                <ul className="space-y-2 text-sm text-stone-700">
                  {analysis.personalBrand.industryInsights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-plum-700">Strategy</h3>
                <ul className="space-y-2 text-sm text-stone-700">
                  {analysis.personalBrand.transformationStrategy.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-plum-700">Body and face fit</h3>
                <ul className="space-y-2 text-sm text-stone-700">
                  {analysis.personalBrand.bodyAnalysis.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {analysis.sustainableAdvice && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-lg bg-emerald-600 p-3 text-white">
                <Leaf className="h-5 w-5" />
              </div>
              <div>
                <h2 className="section-title text-2xl text-emerald-950">Sustainable guidance</h2>
                <p className="text-sm text-emerald-700">Use this to narrow purchases and increase rewear value.</p>
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">Wardrobe optimization</h3>
                <ul className="space-y-2 text-sm text-emerald-900/80">
                  {analysis.sustainableAdvice.wardrobeOptimization.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">Versatility</h3>
                <ul className="space-y-2 text-sm text-emerald-900/80">
                  {analysis.sustainableAdvice.versatilityGuide.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">Purchase filters</h3>
                <ul className="space-y-2 text-sm text-emerald-900/80">
                  {analysis.sustainableAdvice.purchaseGuidance.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>}

      {analysis.haircut && (
        <section className="grid gap-6 rounded-xl border border-stone-200 bg-white p-6 lg:grid-cols-[280px_1fr]">
          <div className="overflow-hidden rounded-xl bg-stone-100">
            {haircutImage ? (
              <img src={haircutImage} alt={analysis.haircut.styleName} className="aspect-[3/4] h-full w-full object-cover object-top" />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center text-sm text-stone-400">Haircut preview unavailable</div>
            )}
          </div>
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-plum-50 px-4 py-2 text-sm font-medium text-plum-700">
              <Scissors className="h-4 w-4" />
              Hair direction
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-stone-950">{analysis.haircut.styleName}</h2>
              <p className="mt-3 text-base leading-7 text-stone-600">{analysis.haircut.description}</p>
            </div>
            <div className="rounded-lg bg-stone-50 p-4 text-sm leading-6 text-stone-600">
              <span className="font-medium text-stone-900">Maintenance:</span> {analysis.haircut.maintenance}
            </div>
          </div>
        </section>
      )}

      {analysis.shoppingList && analysis.shoppingList.length > 0 && (
        <section className="rounded-xl border border-stone-200 bg-white p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="section-title text-2xl text-stone-950">Combined shopping board</h2>
              <p className="text-sm text-stone-500">Product suggestions from this collection.</p>
            </div>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">{analysis.shoppingList.length} items</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {analysis.shoppingList.map((item, index) => {
              const url = productLink(item.url);
              return (
                <div key={item.url || item.name + index} className="rounded-lg border border-stone-200 p-4">
                  {url ? <a href={url} target="_blank" rel="noreferrer" className="font-semibold text-plum-800 underline underline-offset-4">{item.name}</a> :
                    <p className="font-semibold text-stone-900">{item.name}</p>}
                  <p className="mt-2 text-sm text-stone-600">{[item.brand, item.category, item.priceNote].filter(Boolean).join(' · ')}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {sessions.length > 1 && (
        <section className="rounded-xl border border-stone-200 bg-stone-50 p-6 text-sm text-stone-600">
          This session has been added to your local history. Reopen it later from the home screen without rerunning the full flow.
        </section>
      )}
    </div>
  );
};
