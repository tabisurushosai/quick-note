# Porting guide

Quick Note keeps the extension-specific code at the edge so the note logic can be reused for future iOS and Android apps.

## Boundaries

- `src/core` contains pure note logic only. Do not import or reference `chrome.*`, DOM APIs, network APIs, or platform storage APIs here.
- `src/storage/types.ts` defines the storage adapter interface shared by UI code and platform adapters.
- `src/storage/chromeLocalNotesStorage.ts` is the Chrome extension adapter. It is the only storage module that should call `chrome.storage.local`.
- `src/popup.ts` is the current Chrome popup UI boundary. Platform APIs such as `chrome.i18n` should stay at this boundary or move into a platform-specific UI adapter.

## Storage compatibility

Keep the existing local data shape unchanged:

- `notes`: array of `{ content: string }`
- `lastSelectedIndex`: selected note index
- `quickNote`: legacy single-note value used only for migration
- `isPremium`: premium flag
- `trialStartTs`: trial start timestamp

Mobile ports should implement `NotesStorageAdapter` with the same keys and value shapes, then reuse `src/core` hydration and note operations. Do not introduce remote sync, external APIs, or a different persisted format without a migration plan.

## UI portability

When adding or changing UI behavior:

- Keep note state transitions in `src/core` when they do not need platform APIs.
- Keep persistence behind `NotesStorageAdapter`.
- Keep the UI offline-only. Do not add CDN assets, remote code, `eval`, network calls, or additional extension permissions.
- Preserve Manifest V3 and the current Chrome permissions for the extension build.
