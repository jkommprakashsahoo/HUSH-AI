import { HushSession, HushStyle, ThoughtTrail, ChatMessage } from '@/types/chat';

const STORAGE_KEY = 'hush_active_session_v1';
const PREF_KEY = 'hush_storage_preference_v1';

function getStore(kind: 'local' | 'session'): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function getStoragePreference(): 'session' | 'local' {
  const store = getStore('local');
  if (!store) return 'session';
  try {
    return store.getItem(PREF_KEY) === 'local' ? 'local' : 'session';
  } catch {
    return 'session';
  }
}

export function setStoragePreference(pref: 'session' | 'local'): void {
  try {
    getStore('local')?.setItem(PREF_KEY, pref);
  } catch {
    // Storage may be disabled or unavailable in private browsing.
  }
}

function isStyle(value: unknown): value is HushStyle {
  return value === 'quick-fix' || value === 'explain-it' || value === 'think-with-me' || value === 'challenge-me';
}

function isTrail(value: unknown): value is ThoughtTrail {
  if (!value || typeof value !== 'object') return false;
  const trail = value as Partial<ThoughtTrail>;
  return typeof trail.id === 'string' && typeof trail.name === 'string' && typeof trail.createdAt === 'number' && isStyle(trail.style);
}

function isMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Partial<ChatMessage>;
  return typeof message.id === 'string' &&
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string' &&
    typeof message.createdAt === 'number' &&
    typeof message.trailId === 'string' &&
    (message.style === undefined || isStyle(message.style));
}

export function isValidHushSession(value: unknown): value is HushSession {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<HushSession>;
  if (typeof session.id !== 'string' || typeof session.createdAt !== 'number' ||
      typeof session.activeTrailId !== 'string' ||
      (session.persistence !== 'session' && session.persistence !== 'local') ||
      !session.trails || typeof session.trails !== 'object' || Array.isArray(session.trails) ||
      !Array.isArray(session.messages) || !session.messages.every(isMessage)) return false;
  if (session.supabaseSync !== undefined) {
    const sync = session.supabaseSync;
    if (!sync || typeof sync !== 'object' ||
        !sync.trailIds || typeof sync.trailIds !== 'object' ||
        !sync.messageIds || typeof sync.messageIds !== 'object' ||
        Object.values(sync.trailIds).some((id) => typeof id !== 'string') ||
        Object.values(sync.messageIds).some((id) => typeof id !== 'string') ||
        (sync.savedAt !== undefined && typeof sync.savedAt !== 'number')) return false;
  }

  const trails = Object.values(session.trails);
  return trails.length > 0 && trails.every(isTrail) &&
    trails.some((trail) => trail.id === session.activeTrailId) &&
    session.messages.every((message) => Boolean(session.trails?.[message.trailId]));
}

export function loadSession(): HushSession | null {
  const preference = getStoragePreference();
  const primary = getStore(preference);
  const fallback = getStore(preference === 'local' ? 'session' : 'local');

  for (const store of [primary, fallback]) {
    if (!store) continue;
    try {
      const raw = store.getItem(STORAGE_KEY);
      if (!raw) continue;
      const parsed: unknown = JSON.parse(raw);
      if (isValidHushSession(parsed)) return { ...parsed, persistence: preference };
      store.removeItem(STORAGE_KEY);
    } catch {
      try {
        store.removeItem(STORAGE_KEY);
      } catch {
        // Ignore corrupt/unavailable store and continue to fallback.
      }
    }
  }
  return null;
}

export function saveSession(session: HushSession): void {
  const preference = session.persistence || getStoragePreference();
  const target = getStore(preference);
  if (!target) return;
  try {
    target.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    return;
  }
  const other = getStore(preference === 'local' ? 'session' : 'local');
  try {
    other?.removeItem(STORAGE_KEY);
  } catch {
    // Keep the newly saved copy; cleanup is best-effort.
  }
}

export function clearAllStoredSessions(): void {
  for (const store of [getStore('session'), getStore('local')]) {
    try {
      store?.removeItem(STORAGE_KEY);
    } catch {
      // Keep clearing the other store if one is unavailable.
    }
  }
}
