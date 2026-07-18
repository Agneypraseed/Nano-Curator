import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { Sparkles } from 'lucide-react';
import { ProfilePage } from './components/profile/ProfilePage';
import Button from './components/Button';
import { HomePage } from './components/home/HomePage';
import { ResultsPage } from './components/results/ResultsPage';
import { ProfileWizard } from './components/wizard/ProfileWizard';
import { WardrobePage } from './components/wardrobe/WardrobePage';
import { extractWardrobeCutout, generateStyleSession, getProviderStatus, regenerateStyleImage, transformLook } from './services/api';
import { loadSessionHistory, removeSessionHistoryItem, upsertSessionHistory, loadWardrobeLibrary, saveWardrobeLibrary } from './utils/sessionHistory';
import { loadUserProfile, saveUserProfile } from './utils/userProfile';
import { AppStage, ReferenceTab, SessionRecord, StyleAnalysis, StyleOption, UserProfile, WizardState } from './types';

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

  const [wardrobeLibrary, setWardrobeLibrary] = useState<string[]>([]);
  const [apiKeys, setApiKeys] = useState<Partial<Record<'gemini' | 'openai', string>>>({});
  const [providerStatus, setProviderStatus] = useState({ gemini: false, openai: false });
  const [localEndpoints, setLocalEndpoints] = useState({
    text: 'http://localhost:11434/v1',
    vton: 'http://127.0.0.1:7860',
  });

  const activeUserId = authUser?.id || userProfile.id;

  useEffect(() => {
    setSessionHistory(loadSessionHistory(activeUserId));
    setWardrobeLibrary(loadWardrobeLibrary());
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
    sessionIdOverride?: string,
  ) => {
    const sessionId = sessionIdOverride ?? currentSessionId ?? crypto.randomUUID();
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
    setSessionHistory(loadSessionHistory(activeUserId));
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

  const handleAddWardrobeItem = async (base64: string): Promise<string> => {
    let finalImage = base64;
    try {
      const { image } = await extractWardrobeCutout(base64, wizardData, credentials);
      finalImage = image;
    } catch (error) {
      console.error('Wardrobe cutout extraction failed; retaining the source photo.', error);
    }
    setWardrobeLibrary((prev) => {
      const next = prev.includes(finalImage) ? prev : [...prev, finalImage];
      saveWardrobeLibrary(next);
      return next;
    });
    return finalImage;
  };

  const handleRemoveWardrobeItem = (base64: string) => {
    setWardrobeLibrary((prev) => {
      const next = prev.filter((item) => item !== base64);
      saveWardrobeLibrary(next);
      return next;
    });
    setWizardData((prev) => ({
      ...prev,
      wardrobePhotos: prev.wardrobePhotos.filter((photo) => photo !== base64),
    }));
  };

  const runGeneration = async (isMore = false) => {
    if (wizardData.backend === 'local' && (!localEndpoints.text.trim() || !localEndpoints.vton.trim())) {
      setError('Add both local endpoints before generating.');
      return;
    }

    if (wizardData.backend !== 'local' && !providerStatus[wizardData.backend] && !apiKeys[wizardData.backend]?.trim()) {
      setError('Please add your ' + (wizardData.backend === 'openai' ? 'OpenAI' : 'Gemini') + ' API key for the selected model.');
      return;
    }

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

    try {
      // visualSearch needs to be imported! I will make sure visualSearch is imported in the next step.
      const { visualSearch } = await import('./services/api');
      const result = await visualSearch(targetImage);
      
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
      ...session.wizardData,
      model: session.wizardData.model || (session.wizardData.backend === 'local' ? 'local' : 'gemini-3.5-flash'),
    });
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

  const handleStartFromProfile = () => {
    setWizardData((current) => ({
      ...current,
      goals: userProfile.styleGoals || current.goals,
      lifestyle: userProfile.bio || current.lifestyle,
      location: userProfile.location || current.location,
      preferredColors: userProfile.preferredColors || current.preferredColors,
      avoidColors: userProfile.avoidColors || current.avoidColors,
    }));
    setAppStage(AppStage.WIZARD);
  };

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
  const headerAction = useMemo(() => {
    if (appStage === AppStage.HOME || appStage === AppStage.WARDROBE || appStage === AppStage.PROFILE) {
      return (
        <Button onClick={handleStartFromProfile} className="hidden sm:inline-flex">
          Start
        </Button>
      );
    }

    if (appStage === AppStage.WIZARD || appStage === AppStage.RESULTS) {
      return (
        <Button variant="outline" onClick={handleReset} className="hidden sm:inline-flex">
          Home
        </Button>
      );
    }

    return null;
  }, [appStage]);

  const handlePlanSuggestionFromWardrobe = (selectedPhotos: string[]) => {
    setWizardData((prev) => ({
      ...prev,
      wardrobePhotos: selectedPhotos,
    }));
    setAppStage(AppStage.WIZARD);
  };

  const renderLoading = (message: string) => (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-8 px-4 text-center">
      <div className="relative h-32 w-32">
        <div className="absolute inset-0 rounded-full border-8 border-teal-100" />
        <div className="absolute inset-0 animate-spin rounded-full border-8 border-teal-600 border-t-transparent" />
        <Sparkles className="absolute inset-0 m-auto h-10 w-10 animate-pulse text-teal-600" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-stone-800">{message}</h2>
        <p className="text-stone-500">
          The server is building the recommendations and keeping the API key out of the client bundle.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans selection:bg-teal-100 selection:text-teal-900">
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <button type="button" className="flex items-center gap-3" onClick={() => setAppStage(AppStage.HOME)}>
              <div className="rounded-xl bg-stone-950 p-2 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="text-left">
                <div className="text-sm font-medium uppercase tracking-[0.25em] text-stone-400">Nano Curator</div>
                <div className="text-sm text-stone-600">AI style direction</div>
              </div>
            </button>
            <nav className="hidden md:flex items-center gap-4">
              <button
                type="button"
                onClick={() => setAppStage(AppStage.HOME)}
                className={`text-sm font-semibold px-3 py-2 rounded-lg transition ${appStage === AppStage.HOME ? 'text-teal-600 bg-teal-50/50' : 'text-stone-600 hover:text-stone-900'}`}
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => setAppStage(AppStage.WARDROBE)}
                className={`text-sm font-semibold px-3 py-2 rounded-lg transition ${appStage === AppStage.WARDROBE ? 'text-teal-600 bg-teal-50/50' : 'text-stone-600 hover:text-stone-900'}`}
              >
                Wardrobe
              </button>
              <button
                type="button"
                onClick={() => setAppStage(AppStage.PROFILE)}
                className={`text-sm font-semibold px-3 py-2 rounded-lg transition ${appStage === AppStage.PROFILE ? 'text-teal-600 bg-teal-50/50' : 'text-stone-600 hover:text-stone-900'}`}
              >
                Profile
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={authLoading}
              onClick={() => authUser ? void handleSignOut() : setAppStage(AppStage.AUTH)}
              className="hidden rounded-full px-3 py-2 text-xs font-semibold text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50 sm:inline-flex"
            >
              {authLoading ? 'Checking...' : authUser ? 'Sign out' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => setAppStage(AppStage.PROFILE)}
              aria-label="Open profile"
              className="grid h-10 w-10 place-items-center rounded-full border border-stone-200 bg-white text-xs font-semibold text-stone-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
            >
              {profileInitials}
            </button>
            {headerAction}
          </div>
        </div>
      </header>

      <main className="py-8">
        {appStage === AppStage.AUTH && (
          <Suspense fallback={renderLoading('Loading secure sign-in...')}>
            <AuthPage onContinueGuest={() => setAppStage(AppStage.HOME)} />
          </Suspense>
        )}
        {appStage === AppStage.HOME && (
          <HomePage
            sessions={sessionHistory}
            onStart={handleStartFromProfile}
            onRestore={handleRestoreSession}
            onDelete={handleDeleteSession}
            onNavigateWardrobe={() => setAppStage(AppStage.WARDROBE)}
          />
        )}

        {appStage === AppStage.WARDROBE && (
          <WardrobePage
            wardrobeLibrary={wardrobeLibrary}
            onAddWardrobeItem={handleAddWardrobeItem}
            onRemoveWardrobeItem={handleRemoveWardrobeItem}
            onPlanSuggestion={handlePlanSuggestionFromWardrobe}
            onNavigateHome={() => setAppStage(AppStage.HOME)}
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
            onSignIn={() => setAppStage(AppStage.AUTH)}
            onSignOut={() => void handleSignOut()}
          />
        )}
        {appStage === AppStage.WIZARD && (
          <ProfileWizard
            data={wizardData}
            error={error}
            activeReferenceTab={activeRefTab}
            onActiveReferenceTabChange={setActiveRefTab}
            onChange={(patch) => setWizardData((prev) => ({ ...prev, ...patch }))}
            apiKey={wizardData.backend === 'local' ? '' : apiKeys[wizardData.backend] || ''}
            hasServerKey={wizardData.backend === 'local' || providerStatus[wizardData.backend]}
            onApiKeyChange={(value) => {
              if (wizardData.backend !== 'local') setApiKeys((prev) => ({ ...prev, [wizardData.backend]: value }));
            }}
            localTextApiUrl={localEndpoints.text}
            localVtonApiUrl={localEndpoints.vton}
            onLocalEndpointsChange={(patch) => setLocalEndpoints((prev) => ({ ...prev, ...patch }))}
            onAddUserPhoto={handleAddUserPhoto}
            onRemoveUserPhoto={handleRemoveUserPhoto}
            wardrobeLibrary={wardrobeLibrary}
            onNavigateWardrobe={() => setAppStage(AppStage.WARDROBE)}
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
