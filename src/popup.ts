const textArea = document.getElementById('note-content') as HTMLTextAreaElement;

chrome.storage.local.get(['quickNote'], (result) => {
  if (result.quickNote) {
    textArea.value = result.quickNote;
  }
});

textArea.addEventListener('input', () => {
  chrome.storage.local.set({ quickNote: textArea.value });
});
