export type ReferenceTab = 'image' | 'url';

export type BudgetLevel = 'thrift' | 'mid-range' | 'premium' | 'mixed';

export type ClimatePreference = 'hot' | 'mild' | 'cool' | 'cold' | 'variable';

export type DressCodePreference =
  | 'casual'
  | 'smart-casual'
  | 'business-casual'
  | 'business-formal'
  | 'event-ready';

export type WeatherMode = 'auto' | 'manual';

export interface ShoppingAlternative {
  name: string;
  brand: string;
  url: string;
  priceNote?: string;
  reason?: string;
}

export interface ShoppingItem {
  name: string;
  brand: string;
  url: string;
  category?: string;
  priceNote?: string;
  reason?: string;
  alternatives?: ShoppingAlternative[];
}

export interface StyleOption {
  id: string;
  title: string;
  description: string;
  visualPrompt: string;
  reasoning: string;
  palette: string[];
  dressCodeNote?: string;
  weatherNote?: string;
  wardrobeAnchors: string[];
  shoppingItems: ShoppingItem[];
}

export interface HaircutAnalysis {
  styleName: string;
  description: string;
  maintenance: string;
  visualPrompt: string;
}

export interface PersonalBrandReport {
  archetype: string;
  strategicSummary: string;
  industryInsights: string[];
  transformationStrategy: string[];
  bodyAnalysis: string[];
}

export interface SustainableAdvice {
  wardrobeOptimization: string[];
  versatilityGuide: string[];
  purchaseGuidance: string[];
}

export interface WardrobeSummary {
  detectedPieces: string[];
  reusePlan: string[];
  gapPieces: string[];
}

export interface WeatherContext {
  source: 'live' | 'manual' | 'none';
  location: string;
  summary: string;
  temperatureBand?: string;
  stylingNotes: string[];
}

export interface StyleSummary {
  headline: string;
  bestLookId: string;
  bestLookReason: string;
  confidenceNote: string;
  nextStep: string;
}

export interface StyleAnalysis {
  summary: StyleSummary;
  faceShape: string;
  skinTone: string;
  bodyType: string;
  weatherContext?: WeatherContext;
  wardrobeSummary?: WardrobeSummary;
  personalBrand?: PersonalBrandReport;
  sustainableAdvice?: SustainableAdvice;
  styles: StyleOption[];
  haircut?: HaircutAnalysis;
  shoppingList?: ShoppingItem[];
}

export interface WizardState {
  userPhotos: string[];
  wardrobePhotos: string[];
  goals: string;
  lifestyle: string;
  occasion: string;
  budget: BudgetLevel;
  budgetCap: string;
  climate: ClimatePreference;
  dressCode: DressCodePreference;
  location: string;
  weatherMode: WeatherMode;
  weatherNotes: string;
  preferredColors: string;
  avoidColors: string;
  avoidBrands: string;
  referenceImage: string | null;
  referenceUrl: string;
  includeHaircut: boolean;
  findOutfits: boolean;
  backend: 'gemini' | 'local';
  garmentImage: string | null;
}

export interface SessionRecord {
  id: string;
  createdAt: string;
  wizardData: WizardState;
  analysis: StyleAnalysis;
  styleImages: Record<string, string>;
  haircutImage: string | null;
  favoriteLookIds: string[];
}

export interface LookTransformResult {
  style: StyleOption;
  image: string;
}

export enum AppStage {
  HOME = 'HOME',
  WIZARD = 'WIZARD',
  LOADING = 'LOADING',
  RESULTS = 'RESULTS',
}
