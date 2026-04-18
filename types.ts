export interface StyleOption {
  title: string;
  description: string;
  visualPrompt: string;
  reasoning: string;
}

export interface HaircutAnalysis {
  styleName: string;
  description: string;
  visualPrompt: string;
}

export interface ShoppingItem {
  name: string;
  brand: string;
  url: string;
}

export interface PersonalBrandReport {
  archetype: string;
  industryInsights: string[];
  transformationStrategy: string[];
  bodyAnalysis: string[];
}

export interface SustainableAdvice {
  wardrobeOptimization: string[];
  versatilityGuide: string[];
}

export interface StyleAnalysis {
  faceShape: string;
  skinTone: string;
  bodyType: string;
  personalBrand?: PersonalBrandReport;
  sustainableAdvice?: SustainableAdvice;
  styles: StyleOption[];
  haircut?: HaircutAnalysis;
  shoppingList?: ShoppingItem[];
}

export interface WizardState {
  userPhotos: string[];
  goals: string;
  lifestyle: string;
  referenceImage: string | null;
  referenceUrl: string;
  includeHaircut: boolean;
  findOutfits: boolean;
}

export enum AppState {
  HOME = 'HOME',
  WIZARD = 'WIZARD',
  ANALYZING = 'ANALYZING',
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface GeneratedImage {
  url: string;
  prompt: string;
}