# WDIPT — Phase 3–4 (mobile flow)

## Scope and decisions

Phase 3 and 4 have received a user-approved follow-up refinement. This document describes the current implementation. Desktop redesign (phase 5) and final project-wide validation (phase 6) remain **out of scope**.

### Phase 3 — Voice-first quick memory capture

- **Remember something** opens a modal. Its main action is a large microphone button; tapping the microphone directly on the mobile home opens the modal **and** starts speech recognition within the initiating click handler.
- No text field is visible on the mobile home. In the modal, **Type instead** reveals a multiline text field; after dictation, the transcript is visible and can be edited.
- When a phrase is interpreted, the microphone area becomes more compact to prioritize a summary showing the **actual selected** item name, icon, saved location and any note. Manual edits to a location override future automatic suggestions.
- Ambiguous existing locations are offered as selectable candidates. If the spoken/written description names a place the parser cannot securely identify, saving is blocked until the user selects a saved/new place or explicitly presses **Continue without a place (Unsorted)**. No default Unsorted assumption is treated as consent.
- **More options** is collapsed for new memories and expanded for editing existing memories. It contains manual item name, icon, saved location/new location creation, note, and a nested optional individual map pin. The map pin remains separate from the saved place.
- Camera and photo-library buttons are emphasized **outside** More options, with device-local preview, retake/replace and removal. A photo is not uploaded before save.
- All creation still passes through an explicit confirmation screen. Browser/OS microphone permission remains separate; failure leaves the text route available. The microphone never listens in the background.
- No paid services or new database migrations are involved.

### Phase 4 — Larger equal-size mobile home cards

- On phone widths up to 760px, Home contains two equal-size cards: **Find something** and **Remember something**. They use the existing light/sage colors and typography.
- The **entire main card surface**, including its arrow, opens the corresponding modal. Each card's separately clickable microphone starts speech recognition immediately after opening the corresponding modal.
- Search is balanced between a focused text field in its modal and direct voice access; Remember uses the voice-first modal.
- The home contains no input boxes or recent memories. Search results are presented directly below the search entry point.
- Mobile navigation stays **Home / Memory bank / Settings**. The Memory bank holds saved items and filters; Settings is separate.
- The desktop home still uses the original layout with introductory text, search panel, and recent memories. Phase 5 will change desktop independently.
- Responsive sizing keeps both cards visually equal, and test widths include 320 × 568 and 390 × 844.

## Validation and deployment

The release must pass `pnpm run test:suggestions`, `pnpm run test:recognition`, `pnpm exec tsc --noEmit`, targeted ESLint, `pnpm run build` and browser smoke checks of mobile/desktop layouts, text, microphone startup, item/location suggestions, manual correction, pictures, confirmation and actual save. The existing `no-explicit-any` lint debt remains out of scope.

Because native camera and microphone permissions vary by OS/browser, confirm these separately on a physical phone after deployment. No new D1 migration is needed. Commit/push the changed files together; do not begin desktop redesign in this workstream.
