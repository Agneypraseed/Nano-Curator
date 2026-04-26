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
