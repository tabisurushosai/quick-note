import {
  deleteNoteAt,
  getFilteredNotes as getFilteredNoteModels,
  getNoteTitle as getNoteTitleText,
  hydrateNoteState,
  type Note,
} from './core/notes';
import { chromeLocalNotesStorage } from './storage/chromeLocalNotesStorage';

let notes: Note[] = [];
let currentIndex: number = -1;
let isPremium: boolean = false;
let trialStartTs: number | null = null;
let searchQuery: string = '';

const noteList = document.getElementById('note-list') as HTMLDivElement;
const textArea = document.getElementById('note-content') as HTMLTextAreaElement;
const newNoteBtn = document.getElementById('new-note') as HTMLButtonElement;
const searchInput = document.getElementById('search-input') as HTMLInputElement;
const searchContainer = document.getElementById('search-container') as HTMLDivElement;
const upgradeBtn = document.getElementById('upgrade-btn') as HTMLButtonElement;
const premiumBadge = document.getElementById('premium-badge') as HTMLSpanElement;
const appStatus = document.getElementById('app-status') as HTMLSpanElement;

function getMessage(key: string, substitutions?: string | string[]) {
  return chrome.i18n.getMessage(key, substitutions) || key;
}

function translateUI() {
  document.documentElement.lang = chrome.i18n.getUILanguage() || 'ja';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = getMessage(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) (el as HTMLTextAreaElement).placeholder = getMessage(key);
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (key) el.setAttribute('aria-label', getMessage(key));
  });
}

function updatePremiumUI() {
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

function updateStatus(messageKey: string) {
  appStatus.textContent = getMessage(messageKey);
}

function getNoteTitle(note: Note, index: number) {
  return getNoteTitleText(note, getMessage('emptyNote', [(index + 1).toString()]));
}

function getFilteredNotes() {
  return getFilteredNoteModels(notes, isPremium, searchQuery);
}

function getNoteItemElement(index: number) {
  return Array.from(noteList.children).find(el => (el as HTMLDivElement).dataset.index === index.toString()) as HTMLDivElement | undefined;
}

function focusNoteItem(index: number) {
  getNoteItemElement(index)?.querySelector<HTMLButtonElement>('.note-select')?.focus();
}

function selectAdjacentNote(index: number, direction: -1 | 1) {
  const filtered = getFilteredNotes();
  const currentFilteredIndex = filtered.findIndex(note => note.originalIndex === index);
  const nextNote = filtered[currentFilteredIndex + direction];
  if (!nextNote) return;

  selectNote(nextNote.originalIndex, false);
  focusNoteItem(nextNote.originalIndex);
}

function handleNoteItemKeydown(event: KeyboardEvent, index: number) {
  if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
    event.preventDefault();
    selectAdjacentNote(index, -1);
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
    event.preventDefault();
    selectAdjacentNote(index, 1);
  }
}

function renderList() {
  noteList.innerHTML = '';
  
  const filtered = getFilteredNotes();

  if (filtered.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.textContent = searchQuery ? getMessage('emptySearchResults') : getMessage('emptyNoteList');
    noteList.appendChild(emptyState);
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
    selectBtn.setAttribute('aria-current', isActive.toString());
    selectBtn.setAttribute('aria-label', title);
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
    deleteBtn.setAttribute('aria-label', getMessage('tooltipDelete'));
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteNote(index);
    });
    div.appendChild(deleteBtn);

    noteList.appendChild(div);
  });
}

function deleteNote(index: number) {
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

function selectNote(index: number, focusEditor = true) {
  currentIndex = index;
  textArea.value = notes[index].content;
  renderList();
  if (focusEditor) {
    textArea.focus();
  }
}

function saveNotes() {
  updateStatus('statusSaving');
  void chromeLocalNotesStorage.save({
    notes,
    lastSelectedIndex: currentIndex,
    isPremium,
    trialStartTs,
  }).then(
    () => updateStatus('statusSaved'),
    () => updateStatus('statusSaveError'),
  );
}

newNoteBtn.addEventListener('click', () => {
  if (!isPremium && notes.length >= 10) {
    alert(getMessage('premiumLimit'));
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
    notes[currentIndex].content = textArea.value;
    saveNotes();
    // Update the list title as user types
    const activeItem = Array.from(noteList.children).find(el => (el as HTMLDivElement).dataset.index === currentIndex.toString()) as HTMLDivElement | undefined;
    if (activeItem) {
      const titleSpan = activeItem.querySelector('span');
      const selectBtn = activeItem.querySelector<HTMLButtonElement>('.note-select');
      if (titleSpan) {
        const title = getNoteTitle(notes[currentIndex], currentIndex);
        titleSpan.textContent = title;
        selectBtn?.setAttribute('aria-label', title);
      }
    }
  }
});

async function initialize() {
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
    updateStatus('statusSaved');

    if (hydratedState.shouldPersistTrialStart) {
      saveNotes();
    }
    if (hydratedState.shouldRemoveLegacyQuickNote) {
      void chromeLocalNotesStorage.removeLegacyQuickNote().catch(() => updateStatus('statusSaveError'));
    }
  } catch {
    updateStatus('statusSaveError');
  }
}

void initialize();
