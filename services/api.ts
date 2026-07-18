import { LookTransformResult, ShoppingItem, StyleAnalysis, StyleOption, WizardState } from '../types';

interface SessionPayload {
  analysis: StyleAnalysis;
  styleImages: Record<string, string>;
  haircutImage: string | null;
}

export interface ProviderCredentials {
  apiKey?: string;
  localTextApiUrl?: string;
  localVtonApiUrl?: string;
}

export interface ProviderStatus {
  gemini: boolean;
  openai: boolean;
}

const postJson = async <T>(url: string, payload: unknown): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Request failed.');
  }

  return response.json() as Promise<T>;
};

export const getProviderStatus = async (): Promise<ProviderStatus> => {
  const response = await fetch('/api/provider-status');
  if (!response.ok) throw new Error('Unable to check provider configuration.');
  return response.json() as Promise<ProviderStatus>;
};

export const generateStyleSession = (wizardData: WizardState, credentials: ProviderCredentials, isMore = false, existingLookTitles: string[] = []) =>
  postJson<SessionPayload>('/api/generate-session', {
    wizardData,
    credentials,
    isMore,
    existingLookTitles,
  });

export const regenerateStyleImage = (identityImage: string, garmentImage: string | null, prompt: string, wizardData: WizardState, credentials: ProviderCredentials, isHaircut = false) =>
  postJson<{ image: string }>('/api/generate-image', {
    identityImage,
    garmentImage,
    prompt,
    isHaircut,
    wizardData,
    credentials,
  });

export const transformLook = (
  wizardData: WizardState,
  identityImage: string,
  garmentImage: string | null,
  style: StyleOption,
  instruction: string,
  credentials: ProviderCredentials,
) =>
  postJson<LookTransformResult>('/api/transform-look', {
    wizardData,
    identityImage,
    garmentImage,
    style,
    instruction,
    credentials,
  });

export const visualSearch = (image: string) =>
  postJson<{ shoppingItems: ShoppingItem[] }>('/api/visual-search', { image });

export const extractWardrobeCutout = (image: string, wizardData: WizardState, credentials: ProviderCredentials) =>
  postJson<{ image: string }>('/api/extract-wardrobe-cutout', { image, wizardData, credentials });
