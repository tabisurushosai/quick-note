export interface Note {
  content: string;
}

export interface NoteState {
  notes: Note[];
  currentIndex: number;
}

export interface AppState extends NoteState {
  isPremium: boolean;
  trialStartTs: number;
}

export interface StoredNoteState {
  notes?: Note[];
  lastSelectedIndex?: number;
  quickNote?: string;
  isPremium?: boolean;
  trialStartTs?: number;
}

export interface HydratedNoteState extends AppState {
  shouldPersistTrialStart: boolean;
  shouldRemoveLegacyQuickNote: boolean;
}

export interface FilteredNote extends Note {
  originalIndex: number;
}

export function createEmptyNote(): Note {
  return { content: '' };
}

export function isBlankNote(note: Note): boolean {
  return note.content.trim().length === 0;
}

export function isInitialEmptyNoteState(notes: Note[]): boolean {
  return notes.length === 1 && isBlankNote(notes[0]);
}

export function getNoteTitle(note: Note, fallbackTitle: string): string {
  const title = note.content.split('\n')[0].trim();
  return title || fallbackTitle;
}

export function getFilteredNotes(notes: Note[], isPremium: boolean, searchQuery: string): FilteredNote[] {
  const normalizedQuery = searchQuery.toLowerCase();

  return notes.map((note, index) => ({ ...note, originalIndex: index }))
    .filter(note => !isPremium || !normalizedQuery || note.content.toLowerCase().includes(normalizedQuery));
}

export function deleteNoteAt(notes: Note[], currentIndex: number, index: number): NoteState {
  let nextNotes = notes.filter((_, noteIndex) => noteIndex !== index);
  let nextIndex = currentIndex;

  if (currentIndex === index) {
    nextIndex = nextNotes.length > 0 ? Math.max(0, index - 1) : -1;
  } else if (currentIndex > index) {
    nextIndex--;
  }

  if (nextNotes.length === 0) {
    nextNotes = [createEmptyNote()];
    nextIndex = 0;
  }

  return { notes: nextNotes, currentIndex: nextIndex };
}

export function hydrateNoteState(stored: StoredNoteState, now = Date.now()): HydratedNoteState {
  const isPremium = stored.isPremium || false;
  const trialStartTs = stored.trialStartTs || now;
  const shouldPersistTrialStart = !stored.trialStartTs;
  let notes: Note[] = [];
  let currentIndex = -1;
  let shouldRemoveLegacyQuickNote = false;

  if (stored.notes) {
    notes = stored.notes;
    currentIndex = stored.lastSelectedIndex ?? (notes.length > 0 ? 0 : -1);
  } else if (stored.quickNote) {
    notes = [{ content: stored.quickNote }];
    currentIndex = 0;
    shouldRemoveLegacyQuickNote = true;
  }

  if (notes.length === 0) {
    notes = [createEmptyNote()];
    currentIndex = 0;
  }

  return {
    notes,
    currentIndex,
    isPremium,
    trialStartTs,
    shouldPersistTrialStart,
    shouldRemoveLegacyQuickNote,
  };
}
