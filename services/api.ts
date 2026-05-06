import { LookTransformResult, StyleAnalysis, StyleOption, WizardState } from '../types';

interface SessionPayload {
  analysis: StyleAnalysis;
  styleImages: Record<string, string>;
  haircutImage: string | null;
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

export const generateStyleSession = (wizardData: WizardState, isMore = false, existingLookTitles: string[] = []) =>
  postJson<SessionPayload>('/api/generate-session', {
    wizardData,
    isMore,
    existingLookTitles,
  });

export const regenerateStyleImage = (identityImage: string, garmentImage: string | null, prompt: string, isHaircut = false, backend: string = 'gemini') =>
  postJson<{ image: string }>('/api/generate-image', {
    identityImage,
    garmentImage,
    prompt,
    isHaircut,
    backend,
  });

export const transformLook = (
  wizardData: WizardState,
  identityImage: string,
  garmentImage: string | null,
  style: StyleOption,
  instruction: string,
) =>
  postJson<LookTransformResult>('/api/transform-look', {
    wizardData,
    identityImage,
    garmentImage,
    style,
    instruction,
  });
