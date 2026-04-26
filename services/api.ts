import { StyleAnalysis, WizardState } from '../types';

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

export const regenerateStyleImage = (identityImage: string, prompt: string, isHaircut = false) =>
  postJson<{ image: string }>('/api/generate-image', {
    identityImage,
    prompt,
    isHaircut,
  });
