import { LookTransformResult, ShoppingItem, StyleAnalysis, StyleOption, WardrobeItem, WizardState } from '../types';

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

export const sanitizeErrorMessage = (message: string, status: number) => {
  if (!/<(?:!doctype|html|body)[\s>]/i.test(message)) return message;

  const upstreamStatus = message.match(/\b(5\d\d)\b/)?.[1] || String(status);
  const reference = message.match(/Cloudflare Ray ID:\s*<strong[^>]*>([^<]+)/i)?.[1]
    || message.match(/(?:cf-ray|ray id)[:\s]+([a-f0-9-]+)/i)?.[1];

  return `OpenAI is temporarily unavailable (HTTP ${upstreamStatus})${reference ? `; reference ${reference}` : ''}. Please try again.`;
};

const readErrorMessage = async (response: Response) => {
  const body = await response.text();
  try {
    const parsed = JSON.parse(body);
    const message = typeof parsed?.error === 'string' ? parsed.error : parsed?.error?.message;
    if (message) return sanitizeErrorMessage(message, response.status);
  } catch {
    // Fall through to a safe plain-text message.
  }

  if (body) return sanitizeErrorMessage(body, response.status).slice(0, 800);
  return `Request failed with HTTP ${response.status}.`;
};

const postJson = async <T>(url: string, payload: unknown): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
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

export const extractWardrobeItems = (image: string, wizardData: WizardState, credentials: ProviderCredentials) =>
  postJson<{ items: Array<Pick<WardrobeItem, 'label' | 'category' | 'image' | 'cutoutReady'>> }>('/api/extract-wardrobe-items', { image, wizardData, credentials });
