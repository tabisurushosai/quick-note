interface Note {
  content: string;
}

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
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = getMessage(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) (el as HTMLTextAreaElement).placeholder = getMessage(key);
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

interface StorageResult {
  notes?: Note[];
  lastSelectedIndex?: number;
  quickNote?: string;
  isPremium?: boolean;
  trialStartTs?: number;
}

function renderList() {
  noteList.innerHTML = '';
  
  const filtered = notes.map((note, index) => ({ ...note, originalIndex: index }))
    .filter(note => !isPremium || !searchQuery || note.content.toLowerCase().includes(searchQuery.toLowerCase()));

  if (filtered.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.textContent = searchQuery ? getMessage('emptySearchResults') : getMessage('emptyNoteList');
    noteList.appendChild(emptyState);
    return;
  }

  filtered.forEach((note) => {
    const index = note.originalIndex;
    const div = document.createElement('div');
    div.className = 'note-item' + (index === currentIndex ? ' active' : '');
    div.dataset.index = index.toString();
    
    const titleSpan = document.createElement('span');
    titleSpan.className = 'note-title';
    const title = note.content.split('\n')[0].trim();
    titleSpan.textContent = title || getMessage('emptyNote', [(index + 1).toString()]);
    div.appendChild(titleSpan);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-note';
    deleteBtn.textContent = '×';
    deleteBtn.title = getMessage('tooltipDelete');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteNote(index);
    });
    div.appendChild(deleteBtn);

    div.addEventListener('click', () => selectNote(index));
    noteList.appendChild(div);
  });
}

function deleteNote(index: number) {
  if (!confirm(getMessage('confirmDelete'))) return;
  
  notes.splice(index, 1);
  if (currentIndex === index) {
    currentIndex = notes.length > 0 ? Math.max(0, index - 1) : -1;
  } else if (currentIndex > index) {
    currentIndex--;
  }

  if (notes.length === 0) {
    notes = [{ content: '' }];
    currentIndex = 0;
  }

  saveNotes();
  renderList();
  if (currentIndex >= 0) {
    textArea.value = notes[currentIndex].content;
  } else {
    textArea.value = '';
  }
}

function selectNote(index: number) {
  currentIndex = index;
  textArea.value = notes[index].content;
  renderList();
  textArea.focus();
}

function saveNotes() {
  updateStatus('statusSaving');
  chrome.storage.local.set({ 
    notes, 
    lastSelectedIndex: currentIndex,
    isPremium,
    trialStartTs
  }, () => {
    updateStatus(chrome.runtime.lastError ? 'statusSaveError' : 'statusSaved');
  });
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
      if (titleSpan) {
        const title = textArea.value.split('\n')[0].trim();
        titleSpan.textContent = title || getMessage('emptyNote', [(currentIndex + 1).toString()]);
      }
    }
  }
});

translateUI();

chrome.storage.local.get(['notes', 'lastSelectedIndex', 'quickNote', 'isPremium', 'trialStartTs'], (res) => {
  const result = res as StorageResult;
  isPremium = result.isPremium || false;
  trialStartTs = result.trialStartTs || Date.now();
  
  if (!result.trialStartTs) {
    saveNotes(); // Persist trial start
  }

  updatePremiumUI();

  if (result.notes) {
    notes = result.notes;
    currentIndex = result.lastSelectedIndex ?? (notes.length > 0 ? 0 : -1);
  } else if (result.quickNote) {
    // Migration from T001
    notes = [{ content: result.quickNote }];
    currentIndex = 0;
    chrome.storage.local.remove('quickNote');
  }

  if (notes.length === 0) {
    // Start with one empty note if none exist
    notes = [{ content: '' }];
    currentIndex = 0;
  }
  
  renderList();
  if (currentIndex >= 0) {
    textArea.value = notes[currentIndex].content;
    textArea.focus();
  }
  updateStatus('statusSaved');
});
