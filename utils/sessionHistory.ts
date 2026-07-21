import { SessionRecord, WardrobeItem } from '../types';

const STORAGE_KEY = 'nano-curator-session-history';
const SESSION_LIMIT = 4;

export const loadSessionHistory = (userId?: string): SessionRecord[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as SessionRecord[];
    if (!Array.isArray(parsed)) return [];
    return userId ? parsed.filter((session) => !session.userId || session.userId === userId) : parsed;
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

const legacyWardrobeItem = (image: string, index: number): WardrobeItem => ({
  id: 'legacy-' + index + '-' + image.slice(0, 12),
  label: 'Wardrobe item ' + (index + 1),
  category: 'other',
  image,
  createdAt: new Date(0).toISOString(),
  provider: 'legacy',
});

export const loadWardrobeLibrary = (): WardrobeItem[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(WARDROBE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string | WardrobeItem => typeof item === 'string' || Boolean(item?.image))
          .map((item, index) => typeof item === 'string' ? legacyWardrobeItem(item, index) : item);
      }
    }

    // Seed from session history if empty
    const sessions = loadSessionHistory();
    const seen = new Set<string>();
    const items: WardrobeItem[] = [];
    sessions.forEach((session) => {
      const garment = session.wizardData.garmentImage;
      if (garment && !seen.has(garment)) {
        seen.add(garment);
        items.push(legacyWardrobeItem(garment, items.length));
      }
      session.wizardData.wardrobePhotos.forEach((photo) => {
        if (photo && !seen.has(photo)) {
          seen.add(photo);
          items.push(legacyWardrobeItem(photo, items.length));
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

export const saveWardrobeLibrary = (items: WardrobeItem[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(WARDROBE_KEY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save wardrobe library', err);
  }
};
