import type { Note, StoredNoteState } from '../core/notes';

export type { StoredNoteState };

export interface PersistedNoteState {
  notes: Note[];
  lastSelectedIndex: number;
  isPremium: boolean;
  trialStartTs: number | null;
}

export interface NotesStorageAdapter {
  load(): Promise<StoredNoteState>;
  save(state: PersistedNoteState): Promise<void>;
  removeLegacyQuickNote(): Promise<void>;
}
