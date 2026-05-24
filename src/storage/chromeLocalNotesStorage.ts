import {
  LEGACY_QUICK_NOTE_KEY,
  NOTE_STORAGE_KEYS,
  type LoadedNoteStorageSnapshot,
  type NoteStorageKey,
  type NoteStorageSaveInput,
  type NotesStorageAdapter,
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

function pickLoadedNoteStorageSnapshot(result: Partial<LoadedNoteStorageSnapshot>): LoadedNoteStorageSnapshot {
  const stored: LoadedNoteStorageSnapshot = {};

  if ('notes' in result) stored.notes = result.notes;
  if ('lastSelectedIndex' in result) stored.lastSelectedIndex = result.lastSelectedIndex;
  if (LEGACY_QUICK_NOTE_KEY in result) stored[LEGACY_QUICK_NOTE_KEY] = result[LEGACY_QUICK_NOTE_KEY];
  if ('isPremium' in result) stored.isPremium = result.isPremium;
  if ('trialStartTs' in result) stored.trialStartTs = result.trialStartTs;

  return stored;
}

export const chromeLocalNotesStorage: NotesStorageAdapter = {
  load(): Promise<LoadedNoteStorageSnapshot> {
    return runChromeStorageOperation((complete) => {
      chrome.storage.local.get([...NOTE_STORAGE_KEYS], (result) => complete(pickLoadedNoteStorageSnapshot(result)));
    });
  },

  save(state: NoteStorageSaveInput): Promise<void> {
    return runChromeStorageOperation((complete) => {
      chrome.storage.local.set(state, () => complete(undefined));
    });
  },

  remove(keys: readonly NoteStorageKey[]): Promise<void> {
    return runChromeStorageOperation((complete) => {
      chrome.storage.local.remove([...keys], () => complete(undefined));
    });
  },
};
