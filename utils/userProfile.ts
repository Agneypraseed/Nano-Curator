import { UserProfile } from '../types';

const PROFILE_KEY = 'nano-curator-user-profile';

const createProfile = (): UserProfile => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    displayName: 'Your profile',
    email: '',
    jobTitle: '',
    bio: '',
    location: '',
    styleGoals: '',
    preferredColors: '',
    avoidColors: '',
    topSize: '',
    bottomSize: '',
    shoeSize: '',
    fitPreference: 'balanced',
    createdAt: now,
    updatedAt: now,
  };
};

export const loadUserProfile = (): UserProfile => {
  if (typeof window === 'undefined') return createProfile();
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (raw) return { ...createProfile(), ...JSON.parse(raw) } as UserProfile;
  } catch {
    // Fall through and create a fresh local profile.
  }
  const profile = createProfile();
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
};

export const saveUserProfile = (profile: UserProfile): UserProfile => {
  const next = { ...profile, updatedAt: new Date().toISOString() };
  if (typeof window !== 'undefined') window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  return next;
};
