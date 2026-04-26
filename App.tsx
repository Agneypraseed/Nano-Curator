import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import Button from './components/Button';
import { HomePage } from './components/home/HomePage';
import { ResultsPage } from './components/results/ResultsPage';
import { ProfileWizard } from './components/wizard/ProfileWizard';
import { generateStyleSession, regenerateStyleImage, transformLook } from './services/api';
import { loadSessionHistory, removeSessionHistoryItem, upsertSessionHistory } from './utils/sessionHistory';
import { AppStage, ReferenceTab, SessionRecord, StyleAnalysis, StyleOption, WizardState } from './types';

const DEFAULT_WIZARD_DATA: WizardState = {
  userPhotos: [],
  wardrobePhotos: [],
  goals: '',
  lifestyle: '',
  occasion: 'Interview',
  budget: 'mid-range',
  budgetCap: '',
  climate: 'mild',
  dressCode: 'smart-casual',
  location: '',
  weatherMode: 'auto',
  weatherNotes: '',
  preferredColors: '',
  avoidColors: '',
  avoidBrands: '',
  referenceImage: null,
  referenceUrl: '',
  includeHaircut: true,
  findOutfits: true,
};

const dedupeShopping = (styles: StyleOption[]) => {
  const seen = new Set<string>();
  return styles
    .flatMap((style) => style.shoppingItems)
    .filter((item) => {
      const key = item.url || `${item.brand}-${item.name}`;
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
};

export default function App() {
  const [appStage, setAppStage] = useState<AppStage>(AppStage.HOME);
  const [wizardData, setWizardData] = useState<WizardState>(DEFAULT_WIZARD_DATA);
  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null);
  const [styleImages, setStyleImages] = useState<Record<string, string>>({});
  const [haircutImage, setHaircutImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeRefTab, setActiveRefTab] = useState<ReferenceTab>('image');
  const [loadingMessage, setLoadingMessage] = useState('Building your style brief...');
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [refreshingLookId, setRefreshingLookId] = useState<string | null>(null);
  const [editingLookKey, setEditingLookKey] = useState<string | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionRecord[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [favoriteLookIds, setFavoriteLookIds] = useState<string[]>([]);
  const [compareLookIds, setCompareLookIds] = useState<string[]>([]);

  useEffect(() => {
    setSessionHistory(loadSessionHistory());
  }, []);

  const persistSession = (
    nextAnalysis: StyleAnalysis,
    nextStyleImages: Record<string, string>,
    nextHaircutImage: string | null,
    nextFavorites: string[],
    sessionIdOverride?: string,
  ) => {
    const sessionId = sessionIdOverride ?? currentSessionId ?? crypto.randomUUID();
    const record: SessionRecord = {
      id: sessionId,
      createdAt: new Date().toISOString(),
      wizardData,
      analysis: nextAnalysis,
      styleImages: nextStyleImages,
      haircutImage: nextHaircutImage,
      favoriteLookIds: nextFavorites,
    };

    upsertSessionHistory(record);
    setSessionHistory(loadSessionHistory());
    setCurrentSessionId(sessionId);
  };

  const handleAddUserPhoto = (base64: string) => {
    if (wizardData.userPhotos.length < 5) {
      setWizardData((prev) => ({ ...prev, userPhotos: [...prev.userPhotos, base64] }));
    }
  };

  const handleRemoveUserPhoto = (index: number) => {
    setWizardData((prev) => ({
      ...prev,
      userPhotos: prev.userPhotos.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleAddWardrobePhoto = (base64: string) => {
    if (wizardData.wardrobePhotos.length < 6) {
      setWizardData((prev) => ({ ...prev, wardrobePhotos: [...prev.wardrobePhotos, base64] }));
    }
  };

  const handleRemoveWardrobePhoto = (index: number) => {
    setWizardData((prev) => ({
      ...prev,
      wardrobePhotos: prev.wardrobePhotos.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const runGeneration = async (isMore = false) => {
    if (wizardData.userPhotos.length < 1 && !analysis) {
      setError('Please upload at least 1 photo.');
      return;
    }

    setAppStage(AppStage.LOADING);
    setError(null);
    setLoadingMessage(isMore ? 'Designing more looks...' : 'Analyzing your profile and generating looks...');

    if (!isMore) {
      setStyleImages({});
      setHaircutImage(null);
      setCompareLookIds([]);
      setFavoriteLookIds([]);
    }

    try {
      const payload = await generateStyleSession(
        wizardData,
        isMore,
        analysis?.styles.map((style) => style.title) ?? [],
      );

      const nextAnalysis =
        isMore && analysis
          ? {
              ...analysis,
              weatherContext: payload.analysis.weatherContext,
              wardrobeSummary: payload.analysis.wardrobeSummary,
              styles: [...analysis.styles, ...payload.analysis.styles],
              shoppingList: dedupeShopping([...analysis.styles, ...payload.analysis.styles]),
            }
          : payload.analysis;

      const nextStyleImages = isMore ? { ...styleImages, ...payload.styleImages } : payload.styleImages;
      const nextHaircutImage = isMore ? haircutImage : payload.haircutImage;
      const nextFavorites = isMore ? favoriteLookIds : [];

      setAnalysis(nextAnalysis);
      setStyleImages(nextStyleImages);
      setHaircutImage(nextHaircutImage);
      setFavoriteLookIds(nextFavorites);
      setAppStage(AppStage.RESULTS);
      persistSession(
        nextAnalysis,
        nextStyleImages,
        nextHaircutImage,
        nextFavorites,
        isMore ? currentSessionId ?? undefined : undefined,
      );
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
      setAppStage(AppStage.WIZARD);
    }
  };

  const handleGenerate = async () => {
    await runGeneration(false);
  };

  const handleGenerateMore = async () => {
    if (!analysis) {
      return;
    }

    setIsGeneratingMore(true);
    try {
      await runGeneration(true);
    } finally {
      setIsGeneratingMore(false);
    }
  };

  const handleRefreshLook = async (lookId: string) => {
    if (!analysis) {
      return;
    }

    const look = analysis.styles.find((style) => style.id === lookId);
    if (!look || wizardData.userPhotos.length < 1) {
      return;
    }

    setRefreshingLookId(lookId);
    try {
      const response = await regenerateStyleImage(wizardData.userPhotos[0], look.visualPrompt, false);
      const nextStyleImages = { ...styleImages, [lookId]: response.image };
      setStyleImages(nextStyleImages);
      persistSession(analysis, nextStyleImages, haircutImage, favoriteLookIds);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to refresh that look right now.');
    } finally {
      setRefreshingLookId(null);
    }
  };

  const handleTransformLook = async (lookId: string, label: string, instruction: string) => {
    if (!analysis || wizardData.userPhotos.length < 1) {
      return;
    }

    const targetStyle = analysis.styles.find((style) => style.id === lookId);
    if (!targetStyle) {
      return;
    }

    const key = `${lookId}:${label}`;
    setEditingLookKey(key);
    setError(null);

    try {
      const result = await transformLook(wizardData, wizardData.userPhotos[0], targetStyle, instruction);
      const nextStyles = analysis.styles.map((style) => (style.id === lookId ? result.style : style));
      const nextAnalysis: StyleAnalysis = {
        ...analysis,
        styles: nextStyles,
        shoppingList: dedupeShopping(nextStyles),
      };
      const nextStyleImages = { ...styleImages, [lookId]: result.image };
      setAnalysis(nextAnalysis);
      setStyleImages(nextStyleImages);
      persistSession(nextAnalysis, nextStyleImages, haircutImage, favoriteLookIds);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to update that look right now.');
    } finally {
      setEditingLookKey(null);
    }
  };

  const handleToggleFavorite = (lookId: string) => {
    if (!analysis) {
      return;
    }

    const nextFavorites = favoriteLookIds.includes(lookId)
      ? favoriteLookIds.filter((item) => item !== lookId)
      : [...favoriteLookIds, lookId];

    setFavoriteLookIds(nextFavorites);
    persistSession(analysis, styleImages, haircutImage, nextFavorites);
  };

  const handleToggleCompare = (lookId: string) => {
    setCompareLookIds((prev) => {
      if (prev.includes(lookId)) {
        return prev.filter((item) => item !== lookId);
      }
      if (prev.length >= 2) {
        return prev;
      }
      return [...prev, lookId];
    });
  };

  const handleRestoreSession = (session: SessionRecord) => {
    setWizardData(session.wizardData);
    setAnalysis(session.analysis);
    setStyleImages(session.styleImages);
    setHaircutImage(session.haircutImage);
    setFavoriteLookIds(session.favoriteLookIds);
    setCompareLookIds([]);
    setCurrentSessionId(session.id);
    setError(null);
    setAppStage(AppStage.RESULTS);
  };

  const handleDeleteSession = (sessionId: string) => {
    removeSessionHistoryItem(sessionId);
    setSessionHistory(loadSessionHistory());
  };

  const buildBriefText = (targetAnalysis: StyleAnalysis) => {
    const bestLook = targetAnalysis.styles.find((style) => style.id === targetAnalysis.summary.bestLookId) ?? targetAnalysis.styles[0];
    return [
      `Nano Curator Brief`,
      ``,
      `Headline: ${targetAnalysis.summary.headline}`,
      `Best look: ${bestLook?.title || 'N/A'}`,
      `Why it leads: ${targetAnalysis.summary.bestLookReason}`,
      `Next step: ${targetAnalysis.summary.nextStep}`,
      ``,
      `Profile`,
      `- Face shape: ${targetAnalysis.faceShape}`,
      `- Skin tone: ${targetAnalysis.skinTone}`,
      `- Body analysis: ${targetAnalysis.bodyType}`,
      targetAnalysis.weatherContext?.summary ? `- Weather: ${targetAnalysis.weatherContext.summary}` : '',
      targetAnalysis.weatherContext?.temperatureBand ? `- Temperature band: ${targetAnalysis.weatherContext.temperatureBand}` : '',
      ``,
      `Looks`,
      ...targetAnalysis.styles.flatMap((style, index) => [
        `${index + 1}. ${style.title}`,
        `Description: ${style.description}`,
        `Why it works: ${style.reasoning}`,
        style.wardrobeAnchors.length > 0 ? `Owned pieces to reuse: ${style.wardrobeAnchors.join(', ')}` : '',
        style.shoppingItems.length > 0 ? `Products: ${style.shoppingItems.map((item) => `${item.brand} - ${item.name}`).join('; ')}` : '',
        ``,
      ]),
    ]
      .filter(Boolean)
      .join('\n');
  };

  const handleShare = async () => {
    if (!analysis) {
      return;
    }

    const shareText = buildBriefText(analysis);
    if (navigator.share) {
      await navigator.share({
        title: 'Nano Curator style summary',
        text: shareText,
      });
      return;
    }

    await navigator.clipboard.writeText(shareText);
    setError('Full brief copied to clipboard.');
  };

  const handleCopyBrief = async () => {
    if (!analysis) {
      return;
    }

    await navigator.clipboard.writeText(buildBriefText(analysis));
    setError('Full brief copied to clipboard.');
  };

  const handleDownloadBrief = () => {
    if (!analysis) {
      return;
    }

    const blob = new Blob([buildBriefText(analysis)], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'nano-curator-brief.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setAppStage(AppStage.HOME);
    setWizardData(DEFAULT_WIZARD_DATA);
    setAnalysis(null);
    setStyleImages({});
    setHaircutImage(null);
    setError(null);
    setCurrentSessionId(null);
    setFavoriteLookIds([]);
    setCompareLookIds([]);
  };

  const headerAction = useMemo(() => {
    if (appStage === AppStage.HOME) {
      return (
        <Button onClick={() => setAppStage(AppStage.WIZARD)} className="hidden sm:inline-flex">
          Start
        </Button>
      );
    }

    if (appStage === AppStage.WIZARD) {
      return (
        <Button variant="outline" onClick={handleReset} className="hidden sm:inline-flex">
          Home
        </Button>
      );
    }

    return null;
  }, [appStage]);

  const renderLoading = (message: string) => (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-8 px-4 text-center">
      <div className="relative h-32 w-32">
        <div className="absolute inset-0 rounded-full border-8 border-indigo-100" />
        <div className="absolute inset-0 animate-spin rounded-full border-8 border-indigo-600 border-t-transparent" />
        <Sparkles className="absolute inset-0 m-auto h-10 w-10 animate-pulse text-indigo-600" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-800">{message}</h2>
        <p className="text-slate-500">
          The server is building the recommendations and keeping the API key out of the client bundle.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <button type="button" className="flex items-center gap-3" onClick={() => setAppStage(AppStage.HOME)}>
            <div className="rounded-xl bg-slate-950 p-2 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="text-sm font-medium uppercase tracking-[0.25em] text-slate-400">Nano Curator</div>
              <div className="text-sm text-slate-600">AI style direction</div>
            </div>
          </button>
          {headerAction}
        </div>
      </header>

      <main className="py-8">
        {appStage === AppStage.HOME && (
          <HomePage
            sessions={sessionHistory}
            onStart={() => setAppStage(AppStage.WIZARD)}
            onRestore={handleRestoreSession}
            onDelete={handleDeleteSession}
          />
        )}

        {appStage === AppStage.WIZARD && (
          <ProfileWizard
            data={wizardData}
            error={error}
            activeReferenceTab={activeRefTab}
            onActiveReferenceTabChange={setActiveRefTab}
            onChange={(patch) => setWizardData((prev) => ({ ...prev, ...patch }))}
            onAddUserPhoto={handleAddUserPhoto}
            onRemoveUserPhoto={handleRemoveUserPhoto}
            onAddWardrobePhoto={handleAddWardrobePhoto}
            onRemoveWardrobePhoto={handleRemoveWardrobePhoto}
            onGenerate={handleGenerate}
          />
        )}

        {appStage === AppStage.LOADING && renderLoading(loadingMessage)}

        {appStage === AppStage.RESULTS && analysis && (
          <ResultsPage
            analysis={analysis}
            styleImages={styleImages}
            haircutImage={haircutImage}
            favorites={favoriteLookIds}
            compareLookIds={compareLookIds}
            refreshingLookId={refreshingLookId}
            editingLookKey={editingLookKey}
            isGeneratingMore={isGeneratingMore}
            sessions={sessionHistory}
            onNewSession={handleReset}
            onGenerateMore={handleGenerateMore}
            onToggleFavorite={handleToggleFavorite}
            onToggleCompare={handleToggleCompare}
            onRefreshImage={handleRefreshLook}
            onTransformLook={handleTransformLook}
            onPrint={() => window.print()}
            onShare={handleShare}
            onCopyBrief={handleCopyBrief}
            onDownloadBrief={handleDownloadBrief}
          />
        )}
      </main>
    </div>
  );
}
