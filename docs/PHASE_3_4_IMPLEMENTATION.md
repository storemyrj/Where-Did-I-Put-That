# WDIPT — Phase 3–4 implementation

## Scope and approved decisions

This batch implements phase 3 (simplified add-memory dialog) and phase 4 (mobile home) only. Desktop home redesign (phase 5) and the complete end-to-end release gate (phase 6) remain separate.

### Phase 3 — Quick add with details on demand

- The existing Add memory dialog leads with a natural-language text field and an obvious microphone button.
- The same local interpretation engine supports text and speech. Suggestions remain optional and never bypass confirmation.
- **Details (optional)** is collapsed for new memories and open when editing an existing memory. It provides manual name/icon, saved location, creation of new locations, note, photo preview, and a nested optional map pin.
- A known saved place does not automatically attach a map pin. The map pin stays available under Details → Map pin.
- If a phrase cannot identify the item, the confirm action opens Details and focuses the item-name field instead of silently saving incomplete data.
- Photo capture/preview/retake and account preferences from earlier phases remain unchanged.
- The home screen microphone starts browser speech recognition as part of the same user interaction that opens Add memory. The transcript is passed into the common quick-add form, retaining typed/source provenance.
- No new API, schema changes, external services or paid APIs.

### Phase 4 — Mobile home and navigation

- On widths up to 760px the home contains a single brand/header and two primary actions: **Find something** and **Remember something**, both with text and microphone access.
- The home shows no recent memories. After a search, its results take priority over the Remember action.
- Mobile bottom navigation: **Home**, **Memory bank**, **Settings**.
- The Memory bank tab contains saved cards, filters, edits, history and examples. Settings remains available as a separate tab.
- Existing desktop intro, search and recent-memory cards remain in place. Phase 5 will refine them later.
- Both actions fit above the fixed navigation on typical phones. Mobile display obeys reduced-motion preference.

### Local verification

- `pnpm exec tsc --noEmit`
- Targeted ESLint for modified components; the pre-existing `@typescript-eslint/no-explicit-any` baseline remains outside this batch.
- `pnpm run test:suggestions` and `pnpm run test:recognition`.
- `pnpm run build` then start the local Wrangler Worker to smoke-test:
  - widths 320px / 390px, 1300px desktop;
  - 3 mobile tabs, no recent memories on mobile home, legacy desktop unchanged;
  - search, add text, automatic place selection, ambiguous-place choice, confirmation and actual save;
  - microphone-driven prefill; missing name opens Details for manual entry.
- Test real mobile-camera/browser microphone availability after deployment; mocked-browser tests alone cannot verify OS-level permissions.

## Release

No new migration is required. Commit all phase 3–4 changes together after validations and perform the usual deployment/production checks. Do not start phase 5 as part of this batch.
