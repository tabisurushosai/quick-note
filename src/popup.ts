import {
  deleteNoteAt,
  getFilteredNotes as getFilteredNoteModels,
  getNoteTitle as getNoteTitleText,
  hydrateNoteState,
  isInitialEmptyNoteState,
  type FilteredNote,
  type Note,
} from './core/notes';
import { chromeLocalNotesStorage } from './storage/chromeLocalNotesStorage';

let notes: Note[] = [];
let currentIndex = -1;
let isPremium = false;
let trialStartTs: number | null = null;
let searchQuery = '';

const FREE_NOTE_LIMIT = 10;
const DEFAULT_LOCALE = 'ja';

type MessageSubstitutions = string | string[];
type StatusState = 'loading' | 'saving' | 'saved' | 'error';

function getRequiredElement<TElement extends HTMLElement>(id: string): TElement {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: ${id}`);
  }

  return element as TElement;
}

const noteList = getRequiredElement<HTMLDivElement>('note-list');
const textArea = getRequiredElement<HTMLTextAreaElement>('note-content');
const newNoteBtn = getRequiredElement<HTMLButtonElement>('new-note');
const searchInput = getRequiredElement<HTMLInputElement>('search-input');
const searchContainer = getRequiredElement<HTMLDivElement>('search-container');
const upgradeBtn = getRequiredElement<HTMLButtonElement>('upgrade-btn');
const premiumBadge = getRequiredElement<HTMLSpanElement>('premium-badge');
const appStatus = getRequiredElement<HTMLSpanElement>('app-status');
const onboardingGuide = getRequiredElement<HTMLParagraphElement>('onboarding-guide');

function getMessage(key: string, substitutions?: MessageSubstitutions): string {
  return chrome.i18n.getMessage(key, substitutions) || key;
}

function getUiLocale(): string {
  return chrome.i18n.getUILanguage() || DEFAULT_LOCALE;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat(getUiLocale(), { maximumFractionDigits: 0 }).format(value);
}

function translateUI(): void {
  document.documentElement.lang = getUiLocale();
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    if (key) element.textContent = getMessage(key);
  });
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-i18n-placeholder]').forEach((element) => {
    const key = element.dataset.i18nPlaceholder;
    if (key) element.placeholder = getMessage(key);
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-aria-label]').forEach((element) => {
    const key = element.dataset.i18nAriaLabel;
    if (key) element.setAttribute('aria-label', getMessage(key));
  });
}

function updatePremiumUI(): void {
  if (isPremium) {
    premiumBadge.hidden = false;
    upgradeBtn.hidden = true;
    searchContainer.hidden = false;
  } else {
    premiumBadge.hidden = true;
    upgradeBtn.hidden = false;
    searchContainer.hidden = true;
    searchQuery = '';
    searchInput.value = '';
  }
}

function updateStatus(messageKey: string, state: StatusState): void {
  appStatus.textContent = getMessage(messageKey);
  appStatus.dataset.state = state;
}

function getNoteTitle(note: Note, index: number): string {
  return getNoteTitleText(note, getMessage('emptyNote', [formatNumber(index + 1)]));
}

function getSelectNoteAriaLabel(title: string, isActive: boolean): string {
  return isActive ? getMessage('currentNoteAriaLabel', [title]) : title;
}

function getDeleteNoteAriaLabel(title: string): string {
  return getMessage('deleteNoteAriaLabel', [title]);
}

function getFilteredNotes(): FilteredNote[] {
  return getFilteredNoteModels(notes, isPremium, searchQuery);
}

function shouldShowInitialEmptyState(): boolean {
  return !searchQuery && isInitialEmptyNoteState(notes);
}

function updateOnboardingGuide(): void {
  onboardingGuide.hidden = !shouldShowInitialEmptyState();
}

function getNoteItemElement(index: number): HTMLDivElement | undefined {
  return Array.from(noteList.children).find(el => (el as HTMLDivElement).dataset.index === index.toString()) as HTMLDivElement | undefined;
}

function focusNoteItem(index: number): void {
  getNoteItemElement(index)?.querySelector<HTMLButtonElement>('.note-select')?.focus();
}

function selectAdjacentNote(index: number, direction: -1 | 1): void {
  const filtered = getFilteredNotes();
  const currentFilteredIndex = filtered.findIndex(note => note.originalIndex === index);
  const nextNote = filtered[currentFilteredIndex + direction];
  if (!nextNote) return;

  selectNote(nextNote.originalIndex, false);
  focusNoteItem(nextNote.originalIndex);
}

function selectFilteredBoundaryNote(boundary: 'first' | 'last'): void {
  const filtered = getFilteredNotes();
  const nextNote = boundary === 'first' ? filtered[0] : filtered[filtered.length - 1];
  if (!nextNote) return;

  selectNote(nextNote.originalIndex, false);
  focusNoteItem(nextNote.originalIndex);
}

function handleNoteItemKeydown(event: KeyboardEvent, index: number): void {
  if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
    event.preventDefault();
    selectAdjacentNote(index, -1);
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
    event.preventDefault();
    selectAdjacentNote(index, 1);
  } else if (event.key === 'Home') {
    event.preventDefault();
    selectFilteredBoundaryNote('first');
  } else if (event.key === 'End') {
    event.preventDefault();
    selectFilteredBoundaryNote('last');
  }
}

function renderList(): void {
  noteList.innerHTML = '';
  
  const filtered = getFilteredNotes();

  if (filtered.length === 0 || shouldShowInitialEmptyState()) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.setAttribute('role', 'listitem');

    if (searchQuery) {
      emptyState.textContent = getMessage('emptySearchResults');
    } else {
      const title = document.createElement('p');
      title.className = 'empty-state-title';
      title.textContent = getMessage('emptyNoteList');
      emptyState.appendChild(title);

      const description = document.createElement('p');
      description.className = 'empty-state-description';
      description.textContent = getMessage('emptyNoteListDescription');
      emptyState.appendChild(description);

      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'empty-state-action';
      action.textContent = getMessage('emptyNoteAction');
      action.addEventListener('click', () => textArea.focus());
      emptyState.appendChild(action);
    }

    noteList.appendChild(emptyState);
    updateOnboardingGuide();
    return;
  }

  filtered.forEach((note) => {
    const index = note.originalIndex;
    const isActive = index === currentIndex;
    const title = getNoteTitle(note, index);
    const div = document.createElement('div');
    div.className = 'note-item' + (isActive ? ' active' : '');
    div.dataset.index = index.toString();
    div.setAttribute('role', 'listitem');
    
    const selectBtn = document.createElement('button');
    selectBtn.type = 'button';
    selectBtn.className = 'note-select';
    if (isActive) {
      selectBtn.setAttribute('aria-current', 'true');
    }
    selectBtn.setAttribute('aria-label', getSelectNoteAriaLabel(title, isActive));
    selectBtn.addEventListener('click', () => selectNote(index));
    selectBtn.addEventListener('keydown', (event) => handleNoteItemKeydown(event, index));

    const titleSpan = document.createElement('span');
    titleSpan.className = 'note-title';
    titleSpan.textContent = title;
    selectBtn.appendChild(titleSpan);
    div.appendChild(selectBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-note';
    deleteBtn.textContent = '×';
    deleteBtn.title = getMessage('tooltipDelete');
    deleteBtn.setAttribute('aria-label', getDeleteNoteAriaLabel(title));
    deleteBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      deleteNote(index);
    });
    div.appendChild(deleteBtn);

    noteList.appendChild(div);
  });
  updateOnboardingGuide();
}

function deleteNote(index: number): void {
  if (!confirm(getMessage('confirmDelete'))) return;

  const nextState = deleteNoteAt(notes, currentIndex, index);
  notes = nextState.notes;
  currentIndex = nextState.currentIndex;

  saveNotes();
  renderList();
  if (currentIndex >= 0) {
    textArea.value = notes[currentIndex].content;
  } else {
    textArea.value = '';
  }
}

function selectNote(index: number, focusEditor = true): void {
  currentIndex = index;
  textArea.value = notes[index].content;
  renderList();
  if (focusEditor) {
    textArea.focus();
  }
}

function saveNotes(): void {
  updateStatus('statusSaving', 'saving');
  void chromeLocalNotesStorage.save({
    notes,
    lastSelectedIndex: currentIndex,
    isPremium,
    trialStartTs,
  }).then(
    () => updateStatus('statusSaved', 'saved'),
    () => updateStatus('statusSaveError', 'error'),
  );
}

newNoteBtn.addEventListener('click', () => {
  if (!isPremium && notes.length >= FREE_NOTE_LIMIT) {
    alert(getMessage('premiumLimit', [formatNumber(FREE_NOTE_LIMIT)]));
    return;
  }
  notes.push({ content: '' });
  currentIndex = notes.length - 1;
  saveNotes();
  renderList();
  textArea.value = '';
  textArea.focus();
});

searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value;
  renderList();
});

upgradeBtn.addEventListener('click', () => {
  // Simulate Stripe payment success
  isPremium = true;
  saveNotes();
  updatePremiumUI();
  renderList();
});

textArea.addEventListener('input', () => {
  if (currentIndex >= 0) {
    const wasInitialEmptyState = shouldShowInitialEmptyState();
    notes[currentIndex].content = textArea.value;
    saveNotes();
    const isInitialEmptyState = shouldShowInitialEmptyState();
    if (wasInitialEmptyState || isInitialEmptyState) {
      renderList();
      return;
    }
    // Update the list title as user types
    const activeItem = getNoteItemElement(currentIndex);
    if (activeItem) {
      const titleSpan = activeItem.querySelector('span');
      const selectBtn = activeItem.querySelector<HTMLButtonElement>('.note-select');
      if (titleSpan) {
        const title = getNoteTitle(notes[currentIndex], currentIndex);
        titleSpan.textContent = title;
        selectBtn?.setAttribute('aria-label', getSelectNoteAriaLabel(title, true));
      }
    }
  }
});

async function initialize(): Promise<void> {
  translateUI();

  try {
    const result = await chromeLocalNotesStorage.load();
    const hydratedState = hydrateNoteState(result);
    notes = hydratedState.notes;
    currentIndex = hydratedState.currentIndex;
    isPremium = hydratedState.isPremium;
    trialStartTs = hydratedState.trialStartTs;

    updatePremiumUI();
    renderList();
    if (currentIndex >= 0) {
      textArea.value = notes[currentIndex].content;
      textArea.focus();
    }
    updateStatus('statusSaved', 'saved');

    if (hydratedState.shouldPersistTrialStart) {
      saveNotes();
    }
    if (hydratedState.shouldRemoveLegacyQuickNote) {
      void chromeLocalNotesStorage.removeLegacyQuickNote().catch(() => updateStatus('statusSaveError', 'error'));
    }
  } catch {
    updateStatus('statusSaveError', 'error');
  }
}

void initialize();
