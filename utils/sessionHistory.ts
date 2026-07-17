import { SessionRecord } from '../types';

const STORAGE_KEY = 'nano-curator-session-history';
const SESSION_LIMIT = 4;

export const loadSessionHistory = (): SessionRecord[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as SessionRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeHistory = (sessions: SessionRecord[]) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, SESSION_LIMIT)));
};

export const upsertSessionHistory = (session: SessionRecord) => {
  if (typeof window === 'undefined') {
    return;
  }

  const existing = loadSessionHistory().filter((item) => item.id !== session.id);
  writeHistory([session, ...existing]);
};

export const removeSessionHistoryItem = (sessionId: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  const existing = loadSessionHistory().filter((item) => item.id !== sessionId);
  writeHistory(existing);
};

const WARDROBE_KEY = 'nano-curator-wardrobe-library';

export const loadWardrobeLibrary = (): string[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(WARDROBE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }

    // Seed from session history if empty
    const sessions = loadSessionHistory();
    const seen = new Set<string>();
    const items: string[] = [];
    sessions.forEach((session) => {
      const garment = session.wizardData.garmentImage;
      if (garment && !seen.has(garment)) {
        seen.add(garment);
        items.push(garment);
      }
      session.wizardData.wardrobePhotos.forEach((photo) => {
        if (photo && !seen.has(photo)) {
          seen.add(photo);
          items.push(photo);
        }
      });
    });

    if (items.length > 0) {
      window.localStorage.setItem(WARDROBE_KEY, JSON.stringify(items));
    }
    return items;
  } catch {
    return [];
  }
};

export const saveWardrobeLibrary = (items: string[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(WARDROBE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save wardrobe library', err);
  }
};
