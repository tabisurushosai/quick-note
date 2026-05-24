import {
  LEGACY_QUICK_NOTE_KEY,
  NOTE_STORAGE_KEYS,
  type NotesStorageAdapter,
  type PersistedNoteState,
  type StoredNoteState,
} from './types';

function getChromeStorageError(): Error | null {
  const lastError = chrome.runtime.lastError;
  return lastError ? new Error(lastError.message || 'Chrome storage error') : null;
}

function runChromeStorageOperation<T>(operation: (complete: (value: T) => void) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    operation((value) => {
      const error = getChromeStorageError();
      if (error) {
        reject(error);
        return;
      }

      resolve(value);
    });
  });
}

function pickStoredNoteState(result: Partial<StoredNoteState>): StoredNoteState {
  const stored: StoredNoteState = {};

  if ('notes' in result) stored.notes = result.notes;
  if ('lastSelectedIndex' in result) stored.lastSelectedIndex = result.lastSelectedIndex;
  if (LEGACY_QUICK_NOTE_KEY in result) stored[LEGACY_QUICK_NOTE_KEY] = result[LEGACY_QUICK_NOTE_KEY];
  if ('isPremium' in result) stored.isPremium = result.isPremium;
  if ('trialStartTs' in result) stored.trialStartTs = result.trialStartTs;

  return stored;
}

export const chromeLocalNotesStorage: NotesStorageAdapter = {
  load(): Promise<StoredNoteState> {
    return runChromeStorageOperation((complete) => {
      chrome.storage.local.get([...NOTE_STORAGE_KEYS], (result) => complete(pickStoredNoteState(result)));
    });
  },

  save(state: PersistedNoteState): Promise<void> {
    return runChromeStorageOperation((complete) => {
      chrome.storage.local.set(state, () => complete(undefined));
    });
  },

  removeLegacyQuickNote(): Promise<void> {
    return runChromeStorageOperation((complete) => {
      chrome.storage.local.remove(LEGACY_QUICK_NOTE_KEY, () => complete(undefined));
    });
  },
};
