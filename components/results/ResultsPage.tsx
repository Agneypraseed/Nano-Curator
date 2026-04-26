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
  Sparkles,
  Star,
  CloudSun,
  Shirt,
} from 'lucide-react';
import Button from '../Button';
import { LookCard } from './LookCard';
import { SessionRecord, StyleAnalysis, StyleOption } from '../../types';

interface ResultsPageProps {
  analysis: StyleAnalysis;
  styleImages: Record<string, string>;
  haircutImage: string | null;
  favorites: string[];
  compareLookIds: string[];
  refreshingLookId: string | null;
  editingLookKey: string | null;
  isGeneratingMore: boolean;
  sessions: SessionRecord[];
  onNewSession: () => void;
  onGenerateMore: () => void;
  onToggleFavorite: (lookId: string) => void;
  onToggleCompare: (lookId: string) => void;
  onRefreshImage: (lookId: string) => void;
  onTransformLook: (lookId: string, label: string, instruction: string) => void;
  onPrint: () => void;
  onShare: () => void;
  onCopyBrief: () => void;
  onDownloadBrief: () => void;
}

const findLook = (styles: StyleOption[], lookId: string) => styles.find((style) => style.id === lookId);

export const ResultsPage: React.FC<ResultsPageProps> = ({
  analysis,
  styleImages,
  haircutImage,
  favorites,
  compareLookIds,
  refreshingLookId,
  editingLookKey,
  isGeneratingMore,
  sessions,
  onNewSession,
  onGenerateMore,
  onToggleFavorite,
  onToggleCompare,
  onRefreshImage,
  onTransformLook,
  onPrint,
  onShare,
  onCopyBrief,
  onDownloadBrief,
}) => {
  const bestLook = findLook(analysis.styles, analysis.summary.bestLookId) ?? analysis.styles[0];
  const compareLooks = compareLookIds.map((lookId) => findLook(analysis.styles, lookId)).filter(Boolean) as StyleOption[];
  const favoriteLooks = favorites.map((lookId) => findLook(analysis.styles, lookId)).filter(Boolean) as StyleOption[];
  const totalProducts = analysis.styles.reduce((count, style) => count + style.shoppingItems.length, 0);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pb-20 sm:px-6 lg:px-8">
      <section className="grid gap-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-800">
            <Sparkles className="h-4 w-4" />
            {analysis.summary.headline}
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Primary recommendation: {bestLook?.title}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{analysis.summary.bestLookReason}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Face shape</p>
              <p className="mt-1 font-medium text-slate-900">{analysis.faceShape}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Skin tone</p>
              <p className="mt-1 font-medium text-slate-900">{analysis.skinTone}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Body analysis</p>
              <p className="mt-1 font-medium text-slate-900">{analysis.bodyType}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Attached products</p>
              <p className="mt-1 font-medium text-slate-900">{totalProducts}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 rounded-[2rem] bg-slate-950 p-6 text-white">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Recommendation notes</p>
            <p className="text-base leading-7 text-slate-200">{analysis.summary.nextStep}</p>
            <div className="flex items-start gap-2 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <span>{analysis.summary.confidenceNote}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={onPrint} className="bg-white text-slate-950 hover:bg-slate-100">
              <Printer className="mr-2 h-4 w-4" />
              Export / print
            </Button>
            <Button variant="outline" onClick={onShare} className="border-white/20 text-white hover:bg-white/10">
              <Share2 className="mr-2 h-4 w-4" />
              Share summary
            </Button>
            <Button variant="outline" onClick={onCopyBrief} className="border-white/20 text-white hover:bg-white/10">
              <ClipboardCopy className="mr-2 h-4 w-4" />
              Copy brief
            </Button>
            <Button variant="outline" onClick={onDownloadBrief} className="border-white/20 text-white hover:bg-white/10">
              <Download className="mr-2 h-4 w-4" />
              Download brief
            </Button>
            <Button variant="outline" onClick={onNewSession} className="border-white/20 text-white hover:bg-white/10">
              <RotateCcw className="mr-2 h-4 w-4" />
              New session
            </Button>
          </div>
        </div>
      </section>

      {(analysis.weatherContext || analysis.wardrobeSummary) && (
        <section className="grid gap-6 lg:grid-cols-2">
          {analysis.weatherContext && analysis.weatherContext.source !== 'none' && (
            <div className="rounded-[2rem] border border-sky-200 bg-sky-50 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <CloudSun className="h-5 w-5 text-sky-700" />
                <h2 className="text-xl font-semibold text-slate-900">Weather context</h2>
              </div>
              <div className="space-y-2 text-sm leading-6 text-slate-700">
                <p><span className="font-medium">Source:</span> {analysis.weatherContext.source}</p>
                <p><span className="font-medium">Location:</span> {analysis.weatherContext.location}</p>
                <p><span className="font-medium">Summary:</span> {analysis.weatherContext.summary}</p>
                {analysis.weatherContext.temperatureBand && (
                  <p><span className="font-medium">Temperature band:</span> {analysis.weatherContext.temperatureBand}</p>
                )}
              </div>
              {analysis.weatherContext.stylingNotes.length > 0 && (
                <ul className="mt-4 space-y-2 text-sm text-slate-700">
                  {analysis.weatherContext.stylingNotes.map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {analysis.wardrobeSummary && (
            <div className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Shirt className="h-5 w-5 text-amber-700" />
                <h2 className="text-xl font-semibold text-slate-900">Wardrobe reuse plan</h2>
              </div>
              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-900">Detected pieces</h3>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {analysis.wardrobeSummary.detectedPieces.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-900">Reuse plan</h3>
                  <ul className="space-y-2 text-sm text-slate-700">
                    {analysis.wardrobeSummary.reusePlan.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-900">Gap pieces</h3>
                  <ul className="space-y-2 text-sm text-slate-700">
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

      {compareLooks.length === 2 && (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-slate-500" />
            <h2 className="text-xl font-semibold text-slate-900">Compare looks</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {compareLooks.map((look) => (
              <div key={`compare-${look.id}`} className="overflow-hidden rounded-[2rem] border border-slate-200">
                <img src={styleImages[look.id]} alt={look.title} className="aspect-[3/4] w-full object-cover" />
                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold text-slate-900">{look.title}</h3>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{look.shoppingItems.length} products</span>
                  </div>
                  <p className="text-sm leading-6 text-slate-600">{look.reasoning}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {favoriteLooks.length > 0 && (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-semibold text-slate-900">Favorites board</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {favoriteLooks.map((look) => (
              <div key={`favorite-${look.id}`} className="overflow-hidden rounded-[2rem] border border-slate-200">
                <img src={styleImages[look.id]} alt={look.title} className="aspect-[4/5] w-full object-cover" />
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900">{look.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{look.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">Look set</h2>
            <p className="text-sm text-slate-500">Select up to two looks for compare. Refresh or transform any look without rerunning the full session.</p>
          </div>
          <Button variant="outline" onClick={onGenerateMore} isLoading={isGeneratingMore} loadingLabel="Generating more looks">
            <RefreshCw className={`mr-2 h-4 w-4 ${isGeneratingMore ? 'animate-spin' : ''}`} />
            Generate more looks
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {analysis.styles.map((style) => (
            <LookCard
              key={style.id}
              style={style}
              image={styleImages[style.id]}
              isFavorite={favorites.includes(style.id)}
              isSelectedForCompare={compareLookIds.includes(style.id)}
              disableCompare={!compareLookIds.includes(style.id) && compareLookIds.length >= 2}
              isRefreshing={refreshingLookId === style.id}
              activeEditKey={editingLookKey}
              onToggleFavorite={onToggleFavorite}
              onToggleCompare={onToggleCompare}
              onRefreshImage={onRefreshImage}
              onTransformLook={onTransformLook}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        {analysis.personalBrand && (
          <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <Briefcase className="h-5 w-5 text-indigo-300" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Personal brand report</h2>
                <p className="text-sm text-slate-400">{analysis.personalBrand.archetype}</p>
              </div>
            </div>
            <p className="mb-6 text-sm leading-7 text-slate-300">{analysis.personalBrand.strategicSummary}</p>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">Industry</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  {analysis.personalBrand.industryInsights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">Strategy</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  {analysis.personalBrand.transformationStrategy.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">Body and face fit</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  {analysis.personalBrand.bodyAnalysis.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {analysis.sustainableAdvice && (
          <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-600 p-3 text-white">
                <Leaf className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-emerald-950">Sustainable guidance</h2>
                <p className="text-sm text-emerald-700">Use this to narrow purchases and increase rewear value.</p>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
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
      </section>

      {analysis.haircut && (
        <section className="grid gap-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-[280px_1fr]">
          <div className="overflow-hidden rounded-[2rem] bg-slate-100">
            {haircutImage ? (
              <img src={haircutImage} alt={analysis.haircut.styleName} className="aspect-[3/4] h-full w-full object-cover object-top" />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center text-sm text-slate-400">Generating haircut image</div>
            )}
          </div>
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
              <Scissors className="h-4 w-4" />
              Hair direction
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">{analysis.haircut.styleName}</h2>
              <p className="mt-3 text-base leading-7 text-slate-600">{analysis.haircut.description}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              <span className="font-medium text-slate-900">Maintenance:</span> {analysis.haircut.maintenance}
            </div>
          </div>
        </section>
      )}

      {analysis.shoppingList && analysis.shoppingList.length > 0 && (
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-950">Combined shopping board</h2>
              <p className="text-sm text-slate-500">Deduped links across the whole session.</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">{analysis.shoppingList.length} links</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {analysis.shoppingList.map((item) => (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-3xl border border-slate-200 p-4 transition hover:border-slate-900 hover:shadow-sm"
              >
                <p className="font-medium text-slate-900">{item.name}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {item.brand}
                  {item.category ? ` - ${item.category}` : ''}
                  {item.priceNote ? ` - ${item.priceNote}` : ''}
                </p>
              </a>
            ))}
          </div>
        </section>
      )}

      {sessions.length > 1 && (
        <section className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600 shadow-sm">
          This session has been added to your local history. Reopen it later from the home screen without rerunning the full flow.
        </section>
      )}
    </div>
  );
};
