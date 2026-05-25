import type { NoteStateHydrationInput } from '../core/notes';

export type NotesStorageSnapshot = NoteStateHydrationInput;

export type NotesStorageKey = keyof NotesStorageSnapshot;
type RequiredHydrationValue<TKey extends NotesStorageKey> = Exclude<NotesStorageSnapshot[TKey], undefined>;

export const LEGACY_QUICK_NOTE_KEY = 'quickNote' satisfies NotesStorageKey;
export const NOTE_STORAGE_KEYS = [
  'notes',
  'lastSelectedIndex',
  LEGACY_QUICK_NOTE_KEY,
  'isPremium',
  'trialStartTs',
] as const satisfies readonly NotesStorageKey[];

export interface NotesStoragePersistedState {
  notes: RequiredHydrationValue<'notes'>;
  lastSelectedIndex: RequiredHydrationValue<'lastSelectedIndex'>;
  isPremium: RequiredHydrationValue<'isPremium'>;
  trialStartTs: RequiredHydrationValue<'trialStartTs'>;
}

export interface NotesStorageAdapter {
  loadSnapshot(): Promise<NotesStorageSnapshot>;
  saveSnapshot(state: NotesStoragePersistedState): Promise<void>;
  removeKeys(keys: readonly NotesStorageKey[]): Promise<void>;
}
