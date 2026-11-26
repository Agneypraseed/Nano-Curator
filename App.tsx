import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Sparkles } from 'lucide-react';
import { StudioHeader } from './components/StudioHeader';
import { ProfilePage } from './components/profile/ProfilePage';
import { HomePage } from './components/home/HomePage';
import { ResultsPage } from './components/results/ResultsPage';
import { ProfileWizard } from './components/wizard/ProfileWizard';
import { WardrobePage } from './components/wardrobe/WardrobePage';
import { ModelSettingsPage } from './components/models/ModelSettingsPage';
import { extractWardrobeItems, findWardrobeMatches, generateStyleSession, getProviderStatus, regenerateStyleImage, sanitizeErrorMessage, transformLook, visualSearch, type ProviderStatus } from './services/api';
import { loadSessionHistory, removeSessionHistoryItem, upsertSessionHistory, loadWardrobeLibrary, saveWardrobeLibrary } from './utils/sessionHistory';
import { loadUserProfile, saveUserProfile } from './utils/userProfile';
import { AIProvider, AppStage, ReferenceTab, SessionRecord, StyleAnalysis, StyleOption, UserProfile, WardrobeExtractor, WardrobeItem, WardrobeSearchMethod, WizardState } from './types';
import { providerLabels } from './utils/providers';

const AuthPage = lazy(() => import('./components/auth/AuthPage').then((module) => ({ default: module.AuthPage })));

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
  backend: 'gemini',
  model: 'gemini-3.5-flash',
  garmentImage: null,
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
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadUserProfile());
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [appStage, setAppStage] = useState<AppStage>(AppStage.HOME);
  const [wizardData, setWizardData] = useState<WizardState>(DEFAULT_WIZARD_DATA);
  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null);
  const [styleImages, setStyleImages] = useState<Record<string, string>>({});
  const [haircutImage, setHaircutImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const mainRef = useRef<HTMLElement>(null);
  const previousStage = useRef(appStage);
  const generationInProgress = useRef(false);
  const generationDetached = useRef(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeRefTab, setActiveRefTab] = useState<ReferenceTab>('image');
  const [loadingMessage, setLoadingMessage] = useState('Building your style brief...');
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [refreshingLookId, setRefreshingLookId] = useState<string | null>(null);
  const [searchingLookId, setSearchingLookId] = useState<string | null>(null);
  const [editingLookKey, setEditingLookKey] = useState<string | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionRecord[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [favoriteLookIds, setFavoriteLookIds] = useState<string[]>([]);
  const [compareLookIds, setCompareLookIds] = useState<string[]>([]);

  const [wardrobeLibrary, setWardrobeLibrary] = useState<WardrobeItem[]>([]);
  const wardrobeRef = useRef<WardrobeItem[]>([]);
  const [apiKeys, setApiKeys] = useState<Partial<Record<Exclude<AIProvider, 'local'>, string>>>({});
  const [providerStatus, setProviderStatus] = useState<ProviderStatus>({
    gemini: false, openai: false, openrouter: false, meta: false, visualSearch: false,
  });
  const [localEndpoints, setLocalEndpoints] = useState({
    text: 'http://localhost:11434/v1',
    vton: 'http://127.0.0.1:7860',
  });

  const activeUserId = authUser?.id || userProfile.id;
  const activeUserRef = useRef(activeUserId);

  useEffect(() => {
    if (previousStage.current === appStage) return;
    previousStage.current = appStage;
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [appStage]);

  useEffect(() => {
    if (!error) return;
    const sanitized = sanitizeErrorMessage(error, 500);
    if (sanitized !== error) setError(sanitized);
  }, [error]);

  useEffect(() => {
    activeUserRef.current = activeUserId;
    setSessionHistory(loadSessionHistory(activeUserId));
    wardrobeRef.current = loadWardrobeLibrary();
    setWardrobeLibrary(wardrobeRef.current);
    setWizardData((current) => ({
      ...current,
      goals: current.goals || userProfile.styleGoals,
      lifestyle: current.lifestyle || userProfile.bio,
      location: current.location || userProfile.location,
      preferredColors: current.preferredColors || userProfile.preferredColors,
      avoidColors: current.avoidColors || userProfile.avoidColors,
    }));
    getProviderStatus().then(setProviderStatus).catch(() => undefined);
  }, [activeUserId]);

  useEffect(() => {
    let disposed = false;
    let unsubscribe: (() => void) | null = null;

    void import('./services/supabase').then(({ supabase }) => {
      if (disposed) return;
      if (!supabase) {
        setAuthLoading(false);
        return;
      }

      supabase.auth.getSession().then(({ data }) => {
        if (disposed) return;
        setAuthUser(data.session?.user ?? null);
        setAuthLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setAuthUser(session?.user ?? null);
        setAuthLoading(false);
        if (session?.user) {
          setAppStage((current) => current === AppStage.AUTH ? AppStage.PROFILE : current);
          setUserProfile((current) => {
            if (current.displayName !== 'Your profile' && current.email) return current;
            const next = {
              ...current,
              displayName: session.user.user_metadata.full_name || session.user.user_metadata.name || current.displayName,
              email: session.user.email || current.email,
            };
            return saveUserProfile(next);
          });
        }
      });
      unsubscribe = () => subscription.unsubscribe();
    });

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, []);
  const credentials = wizardData.backend === 'local'
    ? { localTextApiUrl: localEndpoints.text, localVtonApiUrl: localEndpoints.vton }
    : { apiKey: apiKeys[wizardData.backend] };
  const isActiveProviderConfigured = wizardData.backend === 'local'
    ? Boolean(localEndpoints.text.trim() && localEndpoints.vton.trim())
    : Boolean(providerStatus[wizardData.backend] || apiKeys[wizardData.backend]?.trim());
  const canUseMetaSam = Boolean(providerStatus.meta || apiKeys.meta?.trim());

  const profileInitials = (userProfile.displayName || 'NC')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const persistSession = (
    nextAnalysis: StyleAnalysis,
    nextStyleImages: Record<string, string>,
    nextHaircutImage: string | null,
    nextFavorites: string[],
    sessionId = currentSessionId ?? crypto.randomUUID(),
    updateCurrent = true,
  ) => {
    const record: SessionRecord = {
      id: sessionId,
      userId: activeUserId,
      createdAt: new Date().toISOString(),
      wizardData,
      analysis: nextAnalysis,
      styleImages: nextStyleImages,
      haircutImage: nextHaircutImage,
      favoriteLookIds: nextFavorites,
    };

    upsertSessionHistory(record);
    setSessionHistory(loadSessionHistory(activeUserRef.current));
    if (updateCurrent) setCurrentSessionId(sessionId);
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

  const updateWardrobe = (items: WardrobeItem[]) => {
    wardrobeRef.current = items;
    setWardrobeLibrary(items);
    return saveWardrobeLibrary(items);
  };

  const handleAddWardrobeItem = async (base64: string, extractor: WardrobeExtractor, targetGarment: string) => {
    const { items, sourceImage, skippedCount } = await extractWardrobeItems(base64, wizardData, credentials, {
      extractor,
      targetGarment,
      metaApiKey: extractor === 'meta-sam' ? apiKeys.meta?.trim() : undefined,
    });
    const currentItems = wardrobeRef.current;
    const newItems: WardrobeItem[] = [];
    const now = new Date().toISOString();
    const key = (item: Pick<WardrobeItem, 'label' | 'category' | 'image'>) => JSON.stringify([item.label, item.category, item.image]);
    const existing = new Set(currentItems.map(key));

    for (const item of items) {
      const itemKey = key(item);
      if (existing.has(itemKey)) continue;
      existing.add(itemKey);
      newItems.push({
        ...item,
        id: crypto.randomUUID(),
        sourceImage: sourceImage || base64,
        createdAt: now,
        provider: item.extractor === 'meta-sam' ? 'meta' : wizardData.backend,
      });
    }

    return { items: newItems, skippedCount, saved: newItems.length === 0 || updateWardrobe([...currentItems, ...newItems]) };
  };

  const handleSearchWardrobe = async (method: WardrobeSearchMethod, query: string, image?: string) => {
    const { shoppingItems } = await findWardrobeMatches(query, image, method, method === 'meta' ? apiKeys.meta?.trim() : undefined);
    return shoppingItems;
  };

  const handleRemoveWardrobeItem = (itemId: string) => {
    const currentItems = wardrobeRef.current;
    const removed = currentItems.find((item) => item.id === itemId);
    const saved = updateWardrobe(currentItems.filter((item) => item.id !== itemId));
    setWizardData((prev) => ({
      ...prev,
      wardrobePhotos: prev.wardrobePhotos.filter((photo) => photo !== removed?.image),
    }));
    return saved;
  };

  const runGeneration = async (isMore = false) => {
    if (generationInProgress.current) return;
    if (wizardData.backend === 'local' && (!localEndpoints.text.trim() || !localEndpoints.vton.trim())) {
      setError('Add both local endpoints before generating.');
      return;
    }

    if (wizardData.backend !== 'local' && !providerStatus[wizardData.backend] && !apiKeys[wizardData.backend]?.trim()) {
      setError('Please add your ' + providerLabels[wizardData.backend] + ' API key.');
      return;
    }

    if (!isMore && wizardData.userPhotos.length < 1) {
      setError('Please upload at least 1 photo.');
      return;
    }

    generationInProgress.current = true;
    generationDetached.current = false;
    setIsGenerating(true);
    setAppStage(AppStage.LOADING);
    setError(null);
    setNotice('');
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
        credentials,
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

      const showResults = !generationDetached.current;
      if (showResults) {
        setAnalysis(nextAnalysis);
        setStyleImages(nextStyleImages);
        setHaircutImage(nextHaircutImage);
        setFavoriteLookIds(nextFavorites);
        setAppStage(AppStage.RESULTS);
      }
      persistSession(
        nextAnalysis,
        nextStyleImages,
        nextHaircutImage,
        nextFavorites,
        isMore && currentSessionId ? currentSessionId : crypto.randomUUID(),
        showResults,
      );
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      if (!generationDetached.current || previousStage.current === AppStage.WIZARD) setError(message);
      if (!generationDetached.current) setAppStage(isMore ? AppStage.RESULTS : AppStage.WIZARD);
    } finally {
      generationInProgress.current = false;
      setIsGenerating(false);
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
    setError(null);
    try {
      const response = await regenerateStyleImage(wizardData.userPhotos[0], wizardData.garmentImage, look.visualPrompt, wizardData, credentials);
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
      const result = await transformLook(wizardData, wizardData.userPhotos[0], wizardData.garmentImage, targetStyle, instruction, credentials);
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

  const handleVisualSearch = async (lookId: string) => {
    if (!analysis) return;
    const targetStyle = analysis.styles.find((style) => style.id === lookId);
    const targetImage = styleImages[lookId];
    if (!targetStyle || !targetImage) return;

    setSearchingLookId(lookId);
    setError(null);
    setNotice('');

    try {
      const pieces = targetStyle.shoppingItems.map((item) => item.name).join(', ');
      const query = [targetStyle.title, targetStyle.description, pieces && 'Suggested pieces: ' + pieces].filter(Boolean).join('\n');
      const result = await visualSearch(targetImage, query, apiKeys.meta?.trim());
      if (result.shoppingItems.length === 0) {
        setNotice('No retailer matches came back for this look.');
        return;
      }

      const nextStyles = analysis.styles.map((style) =>
        style.id === lookId ? { ...style, shoppingItems: result.shoppingItems } : style
      );

      const nextAnalysis: StyleAnalysis = {
        ...analysis,
        styles: nextStyles,
        shoppingList: dedupeShopping(nextStyles),
      };

      setAnalysis(nextAnalysis);
      persistSession(nextAnalysis, styleImages, haircutImage, favoriteLookIds);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unable to find visual matches right now.');
    } finally {
      setSearchingLookId(null);
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
    setWizardData({
      ...DEFAULT_WIZARD_DATA,
      ...session.wizardData,
      model: session.wizardData.model || (session.wizardData.backend === 'local' ? 'local' : 'gemini-3.5-flash'),
    });
    setActiveRefTab(session.wizardData.referenceUrl && !session.wizardData.referenceImage ? 'url' : 'image');
    setAnalysis(session.analysis);
    setStyleImages(session.styleImages);
    setHaircutImage(session.haircutImage);
    setFavoriteLookIds(session.favoriteLookIds);
    setCompareLookIds([]);
    setCurrentSessionId(session.id);
    setError(null);
    setNotice('');
    setAppStage(AppStage.RESULTS);
  };

  const handleDeleteSession = (sessionId: string) => {
    removeSessionHistoryItem(sessionId);
    setSessionHistory(loadSessionHistory(activeUserId));
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

  const handleCopyBrief = async () => {
    if (!analysis) return;
    setError(null);
    setNotice('');
    try {
      await navigator.clipboard.writeText(buildBriefText(analysis));
      setNotice('Style brief copied.');
    } catch {
      setError('The brief could not be copied. You can download it instead.');
    }
  };

  const handleShare = async () => {
    if (!analysis) return;
    if (!navigator.share) {
      await handleCopyBrief();
      return;
    }
    setError(null);
    setNotice('');
    try {
      await navigator.share({
        title: 'Nano Curator style summary',
        text: buildBriefText(analysis),
      });
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError('The brief could not be shared. You can copy or download it instead.');
      }
    }
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
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setError(null);
    setNotice('Style brief downloaded.');
  };

  const handleReset = () => {
    setAppStage(AppStage.WIZARD);
    setWizardData((current) => ({
      ...DEFAULT_WIZARD_DATA,
      backend: current.backend,
      model: current.model,
      goals: userProfile.styleGoals,
      lifestyle: userProfile.bio,
      location: userProfile.location,
      preferredColors: userProfile.preferredColors,
      avoidColors: userProfile.avoidColors,
    }));
    setAnalysis(null);
    setActiveRefTab('image');
    setStyleImages({});
    setHaircutImage(null);
    setError(null);
    setCurrentSessionId(null);
    setNotice('');
    setFavoriteLookIds([]);
    setCompareLookIds([]);
  };

  const handleSaveProfile = (profile: UserProfile) => {
    const savedProfile = saveUserProfile(profile);
    setUserProfile(savedProfile);
    setWizardData((current) => ({
      ...current,
      goals: savedProfile.styleGoals,
      lifestyle: savedProfile.bio,
      location: savedProfile.location,
      preferredColors: savedProfile.preferredColors,
      avoidColors: savedProfile.avoidColors,
    }));
  };

  const handleStartFromProfile = () => setAppStage(AppStage.WIZARD);

  const handleSignOut = async () => {
    try {
      const { signOut } = await import('./services/supabase');
      await signOut();
      setAuthUser(null);
      setAppStage(AppStage.HOME);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign out.');
    }
  };
  const handleNavigate = (stage: AppStage) => {
    if (appStage === stage) return;
    if (appStage === AppStage.LOADING) generationDetached.current = true;
    setError(null);
    setNotice('');
    setAppStage(stage);
  };

  const handlePlanSuggestionFromWardrobe = (selectedPhotos: string[]) => {
    setWizardData((prev) => ({
      ...prev,
      wardrobePhotos: selectedPhotos,
    }));
    setAppStage(AppStage.WIZARD);
  };

  const renderLoading = (message: string) => (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center" role="status">
      <span className="grid size-14 place-items-center rounded-full bg-plum-100 text-plum-700">
        <Sparkles className="size-6 animate-pulse" aria-hidden="true" />
      </span>
      <h1 className="section-title text-3xl">{message}</h1>
      {appStage === AppStage.LOADING && <p className="text-stone-600">This may take a few minutes while your looks are prepared.</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-950 selection:bg-plum-100 selection:text-plum-900">
      <StudioHeader
        stage={appStage}
        profileInitials={authUser ? profileInitials : null}
        authLoading={authLoading}
        onNavigate={handleNavigate}
      />
      <main id="main-content" ref={mainRef} tabIndex={-1} className="focus:outline-none">
        {appStage === AppStage.AUTH && (
          <Suspense fallback={renderLoading('Loading secure sign-in...')}>
            <AuthPage onContinueGuest={() => handleNavigate(AppStage.HOME)} onOpenProfile={() => handleNavigate(AppStage.PROFILE)} />
          </Suspense>
        )}
        {appStage === AppStage.HOME && (
          <HomePage
            sessions={sessionHistory}
            onStart={handleStartFromProfile}
            onOpenWardrobe={() => handleNavigate(AppStage.WARDROBE)}
            onRestore={handleRestoreSession}
            onDelete={handleDeleteSession}
          />
        )}

        {appStage === AppStage.MODELS && (
          <ModelSettingsPage
            data={wizardData}
            apiKey={wizardData.backend === 'local' ? '' : apiKeys[wizardData.backend] || ''}
            hasServerKey={wizardData.backend === 'local' || providerStatus[wizardData.backend]}
            localTextApiUrl={localEndpoints.text}
            localVtonApiUrl={localEndpoints.vton}
            onChange={(patch) => setWizardData((prev) => ({ ...prev, ...patch }))}
            onApiKeyChange={(value) => {
              if (wizardData.backend !== 'local') setApiKeys((prev) => ({ ...prev, [wizardData.backend]: value }));
            }}
            onLocalEndpointsChange={(patch) => setLocalEndpoints((prev) => ({ ...prev, ...patch }))}
          />
        )}

        {appStage === AppStage.WARDROBE && (
          <WardrobePage
            wardrobeLibrary={wardrobeLibrary}
            provider={wizardData.backend}
            model={wizardData.model}
            onAddWardrobeItem={handleAddWardrobeItem}
            onRemoveWardrobeItem={handleRemoveWardrobeItem}
            onPlanSuggestion={handlePlanSuggestionFromWardrobe}
            isProviderConfigured={isActiveProviderConfigured}
            canUseMetaSam={canUseMetaSam}
            canUseLens={Boolean(providerStatus.visualSearch)}
            onSearch={handleSearchWardrobe}
            onOpenModelSettings={() => handleNavigate(AppStage.MODELS)}
          />
        )}

        {appStage === AppStage.PROFILE && (
          <ProfilePage
            profile={userProfile}
            sessionCount={sessionHistory.length}
            wardrobeCount={wardrobeLibrary.length}
            onSave={handleSaveProfile}
            onStart={handleStartFromProfile}
            authEmail={authUser?.email ?? null}
            onSignIn={() => handleNavigate(AppStage.AUTH)}
            onSignOut={() => void handleSignOut()}
            error={error}
          />
        )}
        {appStage === AppStage.WIZARD && (
          <ProfileWizard
            isProviderConfigured={isActiveProviderConfigured}
            onOpenModelSettings={() => handleNavigate(AppStage.MODELS)}
            data={wizardData}
            isGenerating={isGenerating}
            error={error}
            activeReferenceTab={activeRefTab}
            onActiveReferenceTabChange={setActiveRefTab}
            onChange={(patch) => setWizardData((prev) => ({ ...prev, ...patch }))}
            onAddUserPhoto={handleAddUserPhoto}
            onRemoveUserPhoto={handleRemoveUserPhoto}
            wardrobeLibrary={wardrobeLibrary}
            onNavigateWardrobe={() => handleNavigate(AppStage.WARDROBE)}
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
            searchingLookId={searchingLookId}
            isGeneratingMore={isGeneratingMore}
            canUpdateLooks={wizardData.userPhotos.length > 0 && isActiveProviderConfigured && !isGenerating}
            error={error}
            notice={notice}
            onDismissFeedback={() => { setError(null); setNotice(''); }}
            sessions={sessionHistory}
            onNewSession={handleReset}
            onGenerateMore={handleGenerateMore}
            onToggleFavorite={handleToggleFavorite}
            onToggleCompare={handleToggleCompare}
            onRefreshImage={handleRefreshLook}
            onVisualSearch={handleVisualSearch}
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
