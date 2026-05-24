import type { Note, NoteStateHydrationInput } from '../core/notes';

export type StoredNoteState = NoteStateHydrationInput;
export type StoredNoteStateKey = keyof StoredNoteState;

export const LEGACY_QUICK_NOTE_KEY = 'quickNote' satisfies StoredNoteStateKey;
export const NOTE_STORAGE_KEYS = [
  'notes',
  'lastSelectedIndex',
  LEGACY_QUICK_NOTE_KEY,
  'isPremium',
  'trialStartTs',
] as const satisfies readonly StoredNoteStateKey[];

export interface PersistedNoteState {
  notes: Note[];
  lastSelectedIndex: number;
  isPremium: boolean;
  trialStartTs: number | null;
}

export interface NotesStorageAdapter {
  load(): Promise<StoredNoteState>;
  save(state: PersistedNoteState): Promise<void>;
  remove(keys: readonly StoredNoteStateKey[]): Promise<void>;
}
