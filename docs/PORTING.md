# Porting guide

Quick Note keeps the extension-specific code at the edge so the note logic can be reused for future iOS and Android apps.

## Boundaries

- `src/core` contains pure note logic only. Do not import or reference `chrome.*`, DOM APIs, network APIs, or platform storage APIs here.
- `npm run build` runs `tsc -p tsconfig.core.json` before the extension build. That core-only config intentionally has no Chrome or DOM ambient types, so portability regressions fail at typecheck time.
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

Use `NOTE_STORAGE_KEYS` and `LEGACY_QUICK_NOTE_KEY` from `src/storage/types.ts` when implementing a platform adapter so Chrome, iOS, and Android read the same persisted schema. The adapter boundary is intentionally small and platform-neutral:

- `load()` returns `LoadedNoteStorageSnapshot`, including the legacy `quickNote` key when present.
- `save()` writes `NoteStorageSaveInput` with the current notes, selected index, premium flag, and trial timestamp without reshaping the data.
- `remove(keys)` accepts only `NoteStorageKey` values and deletes keys from the persisted note schema, such as the migrated `LEGACY_QUICK_NOTE_KEY`.

For iOS or Android, keep native persistence APIs behind a module that implements `NotesStorageAdapter`. The rest of the app should pass plain note state through this interface rather than importing platform storage SDKs directly.

## Mobile adapter checklist

When creating an iOS or Android app shell:

1. Reuse `src/core` as-is for note creation, deletion, filtering, title generation, and hydration.
2. Implement one platform storage module that satisfies `NotesStorageAdapter`.
3. Store exactly the keys listed in `NOTE_STORAGE_KEYS`; keep `quickNote` readable until legacy migration is no longer needed.
4. Pass loaded snapshots to `hydrateNoteState()` before rendering UI state.
5. Keep native APIs, localization SDKs, and UI framework code outside `src/core`.

## UI portability

When adding or changing UI behavior:

- Keep note state transitions in `src/core` when they do not need platform APIs.
- Keep persistence behind `NotesStorageAdapter`.
- Keep the UI offline-only. Do not add CDN assets, remote code, `eval`, network calls, or additional extension permissions.
- Preserve Manifest V3 and the current Chrome permissions for the extension build.
