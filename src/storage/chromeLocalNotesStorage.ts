import type { NotesStorageAdapter, PersistedNoteState, StoredNoteState } from './types';

const STORAGE_KEYS: (keyof StoredNoteState)[] = ['notes', 'lastSelectedIndex', 'quickNote', 'isPremium', 'trialStartTs'];

function getChromeStorageError(): Error | null {
  const lastError = chrome.runtime.lastError;
  return lastError ? new Error(lastError.message || 'Chrome storage error') : null;
}

export const chromeLocalNotesStorage: NotesStorageAdapter = {
  load(): Promise<StoredNoteState> {
    return new Promise<StoredNoteState>((resolve, reject) => {
      chrome.storage.local.get(STORAGE_KEYS, (result) => {
        const error = getChromeStorageError();
        if (error) {
          reject(error);
          return;
        }

        resolve(result as StoredNoteState);
      });
    });
  },

  save(state: PersistedNoteState): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      chrome.storage.local.set(state, () => {
        const error = getChromeStorageError();
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  },

  removeLegacyQuickNote(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      chrome.storage.local.remove('quickNote', () => {
        const error = getChromeStorageError();
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  },
};
