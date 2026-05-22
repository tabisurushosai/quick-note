interface Note {
  content: string;
}

let notes: Note[] = [];
let currentIndex: number = -1;

const noteList = document.getElementById('note-list') as HTMLDivElement;
const textArea = document.getElementById('note-content') as HTMLTextAreaElement;
const newNoteBtn = document.getElementById('new-note') as HTMLButtonElement;

function renderList() {
  noteList.innerHTML = '';
  notes.forEach((note, index) => {
    const div = document.createElement('div');
    div.className = 'note-item' + (index === currentIndex ? ' active' : '');
    
    const titleSpan = document.createElement('span');
    const title = note.content.split('\n')[0].trim();
    titleSpan.textContent = title || `(Empty Note ${index + 1})`;
    div.appendChild(titleSpan);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-note';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Delete note';
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
  if (!confirm('Are you sure you want to delete this note?')) return;
  
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
  chrome.storage.local.set({ notes, lastSelectedIndex: currentIndex });
}

newNoteBtn.addEventListener('click', () => {
  notes.push({ content: '' });
  currentIndex = notes.length - 1;
  saveNotes();
  renderList();
  textArea.value = '';
  textArea.focus();
});

textArea.addEventListener('input', () => {
  if (currentIndex >= 0) {
    notes[currentIndex].content = textArea.value;
    saveNotes();
    // Update the list title as user types
    const activeItem = noteList.children[currentIndex] as HTMLDivElement;
    if (activeItem) {
      const titleSpan = activeItem.querySelector('span');
      if (titleSpan) {
        const title = textArea.value.split('\n')[0].trim();
        titleSpan.textContent = title || `(Empty Note ${currentIndex + 1})`;
      }
    }
  }
});

chrome.storage.local.get(['notes', 'lastSelectedIndex', 'quickNote'], (result) => {
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
  }
});
