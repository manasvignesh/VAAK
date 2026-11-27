import type { AccessibilitySettings, ClassroomSession } from '../types';

const DB_NAME = 'myvoice-db';
const DB_VERSION = 1;
const SESSIONS_STORE = 'sessions';
const SETTINGS_STORE = 'settings';
const SETTINGS_KEY = 'accessibility';

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  captionSize: 32,
  theme: 'light',
  highContrast: false,
  reducedMotion: false,
  confidenceThreshold: 0.6,
  autoScroll: true,
  commandListeningEnabled: true,
  focusMode: false,
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

export async function saveSession(session: ClassroomSession): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SESSIONS_STORE, 'readwrite');
    tx.objectStore(SESSIONS_STORE).put(session);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to save session'));
  });
}

export async function getAllSessions(): Promise<ClassroomSession[]> {
  try {
    const db = await openDatabase();
    return await new Promise<ClassroomSession[]>((resolve, reject) => {
      const tx = db.transaction(SESSIONS_STORE, 'readonly');
      const req = tx.objectStore(SESSIONS_STORE).getAll();
      req.onsuccess = () => {
        const items = (req.result as ClassroomSession[]) ?? [];
        items.sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
        resolve(items);
      };
      req.onerror = () => reject(req.error ?? new Error('Failed to load sessions'));
    });
  } catch {
    return [];
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SESSIONS_STORE, 'readwrite');
    tx.objectStore(SESSIONS_STORE).delete(sessionId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to delete session'));
  });
}

export async function clearAllSessions(): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SESSIONS_STORE, 'readwrite');
    tx.objectStore(SESSIONS_STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to clear sessions'));
  });
}

export async function saveSettings(settings: AccessibilitySettings): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(SETTINGS_STORE, 'readwrite');
      tx.objectStore(SETTINGS_STORE).put(settings, SETTINGS_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('Failed to save settings'));
    });
  } catch {
    // Fallback to localStorage if IndexedDB fails
    try {
      localStorage.setItem('myvoice-settings', JSON.stringify(settings));
    } catch {
      // ignore
    }
  }
}

export async function loadSettings(): Promise<AccessibilitySettings> {
  try {
    const db = await openDatabase();
    const stored = await new Promise<AccessibilitySettings | undefined>((resolve, reject) => {
      const tx = db.transaction(SETTINGS_STORE, 'readonly');
      const req = tx.objectStore(SETTINGS_STORE).get(SETTINGS_KEY);
      req.onsuccess = () => resolve(req.result as AccessibilitySettings | undefined);
      req.onerror = () => reject(req.error);
    });
    if (stored) {
      return { ...DEFAULT_ACCESSIBILITY_SETTINGS, ...stored };
    }
  } catch {
    // ignore
  }
  try {
    const raw = localStorage.getItem('myvoice-settings');
    if (raw) {
      return { ...DEFAULT_ACCESSIBILITY_SETTINGS, ...(JSON.parse(raw) as Partial<AccessibilitySettings>) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_ACCESSIBILITY_SETTINGS;
}
