import React, { useState, useRef } from 'react';
import { ImageUploader } from './components/ImageUploader';
import Button from './components/Button';
import { analyzeStyleRequest, generateMakeoverGallery } from './services/gemini';
import { AppState, StyleAnalysis, WizardState } from './types';
import { Sparkles, ArrowRight, RotateCcw, X, Link as LinkIcon, ShoppingBag, Scissors, Search, User, RefreshCw, ChevronDown, Briefcase, Leaf, TrendingUp, Target, Recycle, Gem, ScanFace, Check } from 'lucide-react';

const EXAMPLES = [
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80",
  "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&q=80",
];

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);
  // Default findOutfits to TRUE so it always runs
  const [wizardData, setWizardData] = useState<WizardState>({
    userPhotos: [],
    goals: "",
    lifestyle: "",
    referenceImage: null,
    referenceUrl: "",
    includeHaircut: false,
    findOutfits: true 
  });
  
  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null);
  
  // Separate image states to manage appending easily
  const [styleImages, setStyleImages] = useState<string[]>([]);
  const [haircutImage, setHaircutImage] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [activeRefTab, setActiveRefTab] = useState<'image' | 'url'>('image');
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);

  const shoppingSectionRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---

  const scrollToShopping = () => {
    if (shoppingSectionRef.current) {
      shoppingSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // --- Handlers ---

  const handleAddUserPhoto = (base64: string) => {
    if (wizardData.userPhotos.length < 5) {
      setWizardData(prev => ({ ...prev, userPhotos: [...prev.userPhotos, base64] }));
    }
  };

  const handleRemoveUserPhoto = (index: number) => {
    setWizardData(prev => ({
      ...prev,
      userPhotos: prev.userPhotos.filter((_, i) => i !== index)
    }));
  };

  const handleGenerate = async () => {
    if (wizardData.userPhotos.length < 1) {
      setError("Please upload at least 1 photo.");
      return;
    }

    setAppState(AppState.ANALYZING);
    setError(null);
    setStyleImages([]);
    setHaircutImage(null);

    try {
      // Step 1: Analyze & Plan
      const stylePlan = await analyzeStyleRequest(wizardData);
      setAnalysis(stylePlan);
      
      // Step 2: Generate Visuals
      setAppState(AppState.GENERATING);
      
      // Collect prompts with proper typing for generation
      const galleryItems = stylePlan.styles.map(s => ({ prompt: s.visualPrompt, isHaircut: false }));
      if (stylePlan.haircut?.visualPrompt) {
        galleryItems.push({ prompt: stylePlan.haircut.visualPrompt, isHaircut: true });
      }

      // Use the first user photo as the identity anchor
      const images = await generateMakeoverGallery(wizardData.userPhotos[0], galleryItems);
      
      // Separate results
      // The images array corresponds exactly to galleryItems order
      const newStyleImages = images.slice(0, stylePlan.styles.length);
      const newHaircutImage = stylePlan.haircut ? images[images.length - 1] : null;

      setStyleImages(newStyleImages);
      setHaircutImage(newHaircutImage);
      setAppState(AppState.COMPLETE);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong. Please try again.");
      setAppState(AppState.WIZARD);
    }
  };

  const handleGenerateMore = async () => {
    if (!analysis) return;
    
    setIsGeneratingMore(true);
    try {
      // Request more styles (exclude haircut to save time/tokens)
      const moreData = await analyzeStyleRequest(wizardData, true);
      
      // Generate images for new styles
      const newItems = moreData.styles.map(s => ({ prompt: s.visualPrompt, isHaircut: false }));
      const newImages = await generateMakeoverGallery(wizardData.userPhotos[0], newItems);

      // Append to state
      setAnalysis(prev => {
        if (!prev) return moreData;
        return {
          ...prev,
          styles: [...prev.styles, ...moreData.styles],
          shoppingList: [...(prev.shoppingList || []), ...(moreData.shoppingList || [])]
        };
      });
      setStyleImages(prev => [...prev, ...newImages]);

    } catch (err: any) {
      console.error("Failed to generate more:", err);
      // Optional: show a toast or error message
    } finally {
      setIsGeneratingMore(false);
    }
  };

  const handleReset = () => {
    setAppState(AppState.HOME);
    setWizardData({
      userPhotos: [],
      goals: "",
      lifestyle: "",
      referenceImage: null,
      referenceUrl: "",
      includeHaircut: false,
      findOutfits: true 
    });
    setAnalysis(null);
    setStyleImages([]);
    setHaircutImage(null);
    setError(null);
  };

  // --- Views ---

  const renderHome = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-6xl mx-auto px-4 pb-20">
      <div className="text-center space-y-6 mb-16 animate-fade-in pt-10">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900">
          Reinvent Your <span className="text-indigo-600">Style</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto">
          Your personal AI stylist. Upload your photo, choose your vibe, and get custom outfits and haircut suggestions instantly.
        </p>
        <Button onClick={() => setAppState(AppState.WIZARD)} className="px-10 py-4 text-lg shadow-indigo-200">
          Get Started <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
      </div>

      {/* Polaroid Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 w-full mt-8 mb-24">
        {EXAMPLES.map((src, i) => (
          <div 
            key={i} 
            className={`bg-white p-4 pb-12 shadow-2xl border border-slate-100 transform transition-transform hover:scale-105 duration-300
              ${i === 0 ? '-rotate-3' : i === 1 ? 'rotate-2 translate-y-8' : '-rotate-6'}`}
          >
            <div className="aspect-[3/4] overflow-hidden bg-slate-100">
              <img src={src} alt="Style Example" className="w-full h-full object-cover" />
            </div>
            <div className="mt-4 font-handwriting text-slate-500 text-center font-medium">
              {['Urban Chic', 'Summer Vibes', 'Business Modern'][i]}
            </div>
          </div>
        ))}
      </div>

      {/* AI Services Info Cards */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in-up">
        {/* Card 1: Brand Consultant */}
        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-start gap-4 hover:shadow-2xl transition-all">
            <div className="bg-slate-900 text-white p-3 rounded-2xl mb-2">
                <Briefcase className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">Personal Brand Consultant</h3>
            <p className="text-slate-500 leading-relaxed">
                Analyze your professional context, industry trends, and career goals. We recommend complete style transformations with detailed reasoning to help you command the room and elevate your professional identity.
            </p>
        </div>

        {/* Card 2: Sustainable Advisor */}
        <div className="bg-emerald-50 p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-emerald-100 flex flex-col items-start gap-4 hover:shadow-2xl transition-all">
            <div className="bg-emerald-600 text-white p-3 rounded-2xl mb-2">
                <Leaf className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-emerald-900">Sustainable Fashion Advisor</h3>
            <p className="text-emerald-800 leading-relaxed">
                Upload photos of your existing wardrobe. We analyze your lifestyle needs, body type, and face shape to suggest new combinations—preventing unnecessary purchases and maximizing what you own.
            </p>
        </div>
      </div>
    </div>
  );

  const renderWizard = () => (
    <div className="w-full max-w-4xl mx-auto px-4 pb-20 animate-fade-in">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold text-slate-900">Create Your Profile</h2>
        <p className="text-slate-500 mt-2">We need a photo to create your perfect makeovers.</p>
      </div>

      <div className="space-y-12">
        {/* Step 1: User Photos */}
        <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              1. Your Photos <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Min 1 • Max 5</span>
            </h3>
            <span className="text-sm text-slate-500">{wizardData.userPhotos.length} / 5</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {wizardData.userPhotos.map((photo, idx) => (
              <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden group border border-slate-200">
                <img src={`data:image/jpeg;base64,${photo}`} className="w-full h-full object-cover" alt="User" />
                <button 
                  onClick={() => handleRemoveUserPhoto(idx)}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-1 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {wizardData.userPhotos.length < 5 && (
              <ImageUploader onImageSelected={handleAddUserPhoto} compact />
            )}
          </div>
        </section>

        {/* Step 2: Preferences (Updated Form) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 h-full flex flex-col gap-6">
            <h3 className="text-lg font-bold text-slate-800">2. Context & Lifestyle</h3>
            
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                    What is the occasion or your main goal?
                </label>
                <input
                    type="text"
                    className="w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-slate-900 placeholder:text-slate-400 bg-slate-50 transition-all"
                    placeholder="E.g. Wedding guest, Job interview, Summer capsule wardrobe..."
                    value={wizardData.goals}
                    onChange={(e) => setWizardData(prev => ({ ...prev, goals: e.target.value }))}
                />
            </div>

            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Describe your lifestyle or specific needs.
                </label>
                <textarea
                    className="w-full h-32 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none text-slate-900 placeholder:text-slate-400 bg-slate-50 transition-all"
                    placeholder="E.g. I work in a creative office, I bike to work, I prefer sustainable fabrics, I dislike bright colors..."
                    value={wizardData.lifestyle}
                    onChange={(e) => setWizardData(prev => ({ ...prev, lifestyle: e.target.value }))}
                />
            </div>
          </section>

          <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 h-full">
             <h3 className="text-lg font-bold text-slate-800 mb-4">3. Reference Style (Optional)</h3>
             <div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-xl w-fit">
                <button 
                  onClick={() => setActiveRefTab('image')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeRefTab === 'image' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Upload Image
                </button>
                <button 
                  onClick={() => setActiveRefTab('url')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeRefTab === 'url' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Web Link
                </button>
             </div>

             {activeRefTab === 'image' ? (
                wizardData.referenceImage ? (
                  <div className="relative h-40 w-full rounded-xl overflow-hidden border border-slate-200 group">
                     <img src={`data:image/jpeg;base64,${wizardData.referenceImage}`} className="w-full h-full object-cover" alt="Ref" />
                     <button 
                        onClick={() => setWizardData(prev => ({ ...prev, referenceImage: null }))}
                        className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-1 rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                  </div>
                ) : (
                  <ImageUploader onImageSelected={(b64) => setWizardData(prev => ({ ...prev, referenceImage: b64 }))} />
                )
             ) : (
                <div className="space-y-2">
                   <p className="text-sm text-slate-500">Paste a link to an outfit or celebrity style.</p>
                   <div className="flex items-center border border-slate-200 rounded-xl px-3 py-3 bg-white focus-within:ring-2 focus-within:ring-indigo-500">
                      <LinkIcon className="w-5 h-5 text-slate-400 mr-2" />
                      <input 
                        type="url" 
                        placeholder="https://pinterest.com/..."
                        className="w-full outline-none text-slate-900 bg-white"
                        value={wizardData.referenceUrl}
                        onChange={(e) => setWizardData(prev => ({ ...prev, referenceUrl: e.target.value }))}
                      />
                   </div>
                </div>
             )}
          </section>
        </div>

        {/* Step 3: Options & Action */}
        <section className="bg-slate-50 p-6 md:p-8 rounded-3xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
           <div className="flex flex-col sm:flex-row gap-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                 <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${wizardData.includeHaircut ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white group-hover:border-indigo-400'}`}>
                    {wizardData.includeHaircut && <Scissors className="w-3 h-3 text-white" />}
                 </div>
                 <input 
                   type="checkbox" 
                   className="hidden" 
                   checked={wizardData.includeHaircut}
                   onChange={(e) => setWizardData(prev => ({ ...prev, includeHaircut: e.target.checked }))}
                 />
                 <span className="font-medium text-slate-700">Suggest Haircut</span>
              </label>
           </div>

           <Button 
             onClick={handleGenerate} 
             disabled={wizardData.userPhotos.length < 1}
             className="w-full md:w-auto px-12 py-4 text-lg"
           >
             <Sparkles className="w-5 h-5 mr-2" /> Generate
           </Button>
        </section>
      </div>
    </div>
  );

  const renderLoading = (message: string) => (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="relative w-32 h-32">
          <div className="absolute inset-0 border-8 border-indigo-100 rounded-full" />
          <div className="absolute inset-0 border-8 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <Sparkles className="absolute inset-0 m-auto text-indigo-600 w-10 h-10 animate-pulse" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-slate-800">{message}</h2>
        <p className="text-slate-500">Powered by Gemini Nano Banana</p>
      </div>
    </div>
  );

  const renderResults = () => {
    // If haircut was requested, it is available in analysis.haircut and haircutImage state
    const hasHaircut = !!analysis?.haircut;

    return (
      <div className="w-full max-w-7xl mx-auto px-4 pb-20 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-slate-900">Your Style Collection</h2>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
               <span className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full"><User className="w-4 h-4" /> {analysis?.faceShape} Face</span>
               <span className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full">✨ {analysis?.skinTone}</span>
               {analysis?.bodyType && <span className="flex items-center gap-1 bg-slate-100 px-3 py-1 rounded-full">📏 {analysis.bodyType}</span>}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleReset} className="border-slate-200">
              <RotateCcw className="w-4 h-4 mr-2" /> New Request
            </Button>
          </div>
        </div>

        {/* Styles Grid - "Look 01" Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-12">
          {analysis?.styles.map((style, idx) => (
            <div key={idx} className="flex flex-col items-center group">
              {/* Image Container with specific rounded style */}
              <div className="relative w-full aspect-[3/4] rounded-[3rem] overflow-hidden shadow-2xl mb-6 bg-slate-100 border-4 border-white">
                 {styleImages[idx] ? (
                    <img 
                      src={styleImages[idx]} 
                      alt={style.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                 ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">Loading...</div>
                 )}
                 {styleImages[idx] && (
                   <a 
                      href={styleImages[idx]} 
                      download={`look-${idx + 1}.png`} 
                      className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/40 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <ArrowRight className="w-5 h-5 -rotate-45" />
                   </a>
                 )}
              </div>
              
              {/* "LOOK 0X" Typography */}
              <div className="text-center space-y-3 px-4 max-w-sm w-full">
                 <h3 className="font-serif text-2xl tracking-[0.2em] text-slate-900 uppercase">
                    Look 0{idx + 1}
                 </h3>
                 <p className="text-slate-500 text-sm leading-relaxed font-medium">
                    {style.description}
                 </p>
                 <div className="flex flex-col items-center gap-2 pt-2">
                    <p className="text-xs text-slate-400 uppercase tracking-widest">
                        {style.title}
                    </p>
                    {/* Shop This Look Button on the card */}
                    {analysis?.shoppingList && analysis.shoppingList.length > 0 && (
                        <button 
                            onClick={scrollToShopping}
                            className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-full hover:bg-indigo-600 transition-colors shadow-lg"
                        >
                            <ShoppingBag className="w-3 h-3" /> Shop This Look <ChevronDown className="w-3 h-3" />
                        </button>
                    )}
                 </div>
              </div>
            </div>
          ))}
        </div>

         {/* Generate More Button - Centered below grid */}
         <div className="flex justify-center mb-20 border-t border-slate-200 pt-10">
            <Button 
                variant="outline" 
                onClick={handleGenerateMore} 
                className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-900 px-8 py-4 rounded-full font-semibold shadow-sm transition-all"
                isLoading={isGeneratingMore}
            >
                <RefreshCw className={`w-5 h-5 mr-2 ${isGeneratingMore ? 'animate-spin' : ''}`} /> 
                {isGeneratingMore ? 'Designing New Looks...' : 'Generate More Styles'}
            </Button>
        </div>

        {/* SECTION 2: Personal Brand Consultant Report */}
        {analysis?.personalBrand && (
          <div className="mb-20 bg-slate-900 text-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-slate-700 pb-8">
              <div className="flex items-center gap-4">
                <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm">
                  <Briefcase className="w-8 h-8 text-indigo-400" />
                </div>
                <div>
                    <h3 className="text-3xl font-bold">Personal Brand Report</h3>
                    <p className="text-slate-400 mt-1">Strategic style analysis</p>
                </div>
              </div>
              
              <div className="bg-indigo-600/20 border border-indigo-500/30 px-6 py-3 rounded-xl">
                 <span className="text-xs uppercase tracking-widest text-indigo-300 block mb-1">Your Archetype</span>
                 <span className="text-xl font-bold text-white">{analysis.personalBrand.archetype}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
               {/* Industry Trends */}
               <div className="space-y-4">
                  <h4 className="font-bold text-indigo-300 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" /> Industry Analysis
                  </h4>
                  <ul className="space-y-3">
                    {analysis.personalBrand.industryInsights.map((point, i) => (
                      <li key={i} className="flex items-start gap-3 text-slate-300 text-sm leading-relaxed">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>
               </div>

               {/* Goals */}
               <div className="space-y-4">
                  <h4 className="font-bold text-indigo-300 flex items-center gap-2">
                     <Target className="w-5 h-5" /> Strategy
                  </h4>
                  <ul className="space-y-3">
                    {analysis.personalBrand.transformationStrategy.map((point, i) => (
                      <li key={i} className="flex items-start gap-3 text-slate-300 text-sm leading-relaxed">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        {point}
                      </li>
                    ))}
                  </ul>
               </div>

               {/* Body Analysis */}
               <div className="space-y-4">
                  <h4 className="font-bold text-indigo-300 flex items-center gap-2">
                     <ScanFace className="w-5 h-5" /> Body & Face
                  </h4>
                  <ul className="space-y-3">
                    {analysis.personalBrand.bodyAnalysis.map((point, i) => (
                      <li key={i} className="flex items-start gap-3 text-slate-300 text-sm leading-relaxed">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>
               </div>
            </div>
          </div>
        )}

        {/* SECTION 3: Sustainable Fashion Advisor Report */}
        {analysis?.sustainableAdvice && (
          <div className="mb-20 bg-emerald-50 rounded-[2.5rem] p-8 md:p-12 border border-emerald-100 shadow-lg">
            <div className="flex items-center gap-4 mb-8">
              <div className="bg-emerald-600 p-3 rounded-2xl text-white">
                <Leaf className="w-6 h-6" />
              </div>
              <h3 className="text-3xl font-bold text-emerald-900">Sustainable Style Advisor</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
               {/* Wardrobe Optimization */}
               <div className="bg-white/60 p-8 rounded-3xl">
                  <h4 className="font-bold text-emerald-800 mb-4 flex items-center gap-2 text-lg">
                     <Recycle className="w-5 h-5" /> Smart Wardrobe Integration
                  </h4>
                  <ul className="space-y-3">
                    {analysis.sustainableAdvice.wardrobeOptimization.map((point, i) => (
                      <li key={i} className="flex items-start gap-3 text-emerald-900/80 text-sm leading-relaxed">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>
               </div>
               
               {/* Versatility Guide */}
               <div className="bg-white/60 p-8 rounded-3xl">
                  <h4 className="font-bold text-emerald-800 mb-4 flex items-center gap-2 text-lg">
                    <Gem className="w-5 h-5" /> Versatility & Longevity
                  </h4>
                  <ul className="space-y-3">
                    {analysis.sustainableAdvice.versatilityGuide.map((point, i) => (
                      <li key={i} className="flex items-start gap-3 text-emerald-900/80 text-sm leading-relaxed">
                         <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        {point}
                      </li>
                    ))}
                  </ul>
               </div>
            </div>
          </div>
        )}

        {/* Suggested Haircut Section */}
        {hasHaircut && analysis?.haircut && (
          <div className="mb-20 max-w-4xl mx-auto border-t border-slate-200 pt-10">
             <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-slate-100 flex flex-col md:flex-row gap-8 items-start">
               {/* Left Image */}
               <div className="w-full md:w-64 flex-shrink-0">
                 {/* Changed to aspect-[3/4] and object-top to ensure headshot isn't cropped weirdly */}
                 <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100 shadow-md">
                   {haircutImage ? (
                     <img src={haircutImage} alt="Suggested Haircut" className="w-full h-full object-cover object-top" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-slate-400">Loading...</div>
                   )}
                 </div>
               </div>
               
               {/* Right Content */}
               <div className="flex-1 py-2 space-y-4">
                  <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full text-sm font-semibold">
                    <Scissors className="w-4 h-4" /> Suggested Haircut
                  </div>
                  
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                      {analysis.haircut.styleName}
                    </h3>
                    <p className="text-slate-600 leading-relaxed text-base md:text-lg">
                      {analysis.haircut.description}
                    </p>
                  </div>

                  {haircutImage && (
                    <div className="pt-2">
                      <a 
                        href={haircutImage} 
                        download="haircut-suggestion.png"
                        className="inline-flex items-center text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        Download Reference <ArrowRight className="w-4 h-4 ml-1" />
                      </a>
                    </div>
                  )}
               </div>
             </div>
          </div>
        )}

        {/* Shopping Section - Moved to bottom */}
        {analysis?.shoppingList && analysis.shoppingList.length > 0 && (
           <div ref={shoppingSectionRef} className="pt-10 border-t-4 border-slate-900">
              <div className="bg-slate-50 p-8 md:p-12 rounded-[2.5rem] border border-slate-200 shadow-inner">
                <h3 className="text-3xl font-bold mb-10 flex items-center justify-center gap-3 text-slate-900">
                    <ShoppingBag className="w-8 h-8 text-indigo-600" /> Shop The Collection
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                    {analysis.shoppingList.map((item, i) => (
                    <div key={i} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col h-full transform hover:-translate-y-1">
                        <div className="flex-1 mb-6">
                            {/* Product Name */}
                            <h4 className="font-bold text-lg text-slate-900 line-clamp-2 mb-2 leading-tight" title={item.name}>
                                {item.name}
                            </h4>
                            {/* Website Name / Brand */}
                            <p className="text-sm font-medium text-indigo-500 bg-indigo-50 inline-block px-2 py-1 rounded-md">
                                {item.brand}
                            </p>
                        </div>
                        {/* View Product Button */}
                        <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="w-full mt-auto bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm hover:bg-indigo-600 transition-colors flex items-center justify-center gap-2 group"
                        >
                        View Product <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </a>
                    </div>
                    ))}
                </div>
              </div>
           </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 mb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setAppState(AppState.HOME)}>
            <div className="bg-black text-white p-1.5 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight">Nano Curator</span>
          </div>
        </div>
      </header>

      <main>
        {error && (
          <div className="max-w-md mx-auto mb-8 bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-200 text-center">
            {error}
          </div>
        )}

        {appState === AppState.HOME && renderHome()}
        {appState === AppState.WIZARD && renderWizard()}
        {appState === AppState.ANALYZING && renderLoading("Analyzing your profile & creating style collection...")}
        {appState === AppState.GENERATING && renderLoading("Generating your editorial photoshoot...")}
        {appState === AppState.COMPLETE && renderResults()}
      </main>
    </div>
  );
}