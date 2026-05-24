import type { Note } from '../core/notes';

export interface LoadedNoteStorageSnapshot {
  notes?: Note[];
  lastSelectedIndex?: number;
  quickNote?: string;
  isPremium?: boolean;
  trialStartTs?: number | null;
}

export type NoteStorageKey = keyof LoadedNoteStorageSnapshot;

export const LEGACY_QUICK_NOTE_KEY = 'quickNote' satisfies NoteStorageKey;
export const NOTE_STORAGE_KEYS = [
  'notes',
  'lastSelectedIndex',
  LEGACY_QUICK_NOTE_KEY,
  'isPremium',
  'trialStartTs',
] as const satisfies readonly NoteStorageKey[];

export interface NoteStorageSaveInput {
  notes: Note[];
  lastSelectedIndex: number;
  isPremium: boolean;
  trialStartTs: number | null;
}

export interface NotesStorageAdapter {
  load(): Promise<LoadedNoteStorageSnapshot>;
  save(state: NoteStorageSaveInput): Promise<void>;
  remove(keys: readonly NoteStorageKey[]): Promise<void>;
}
