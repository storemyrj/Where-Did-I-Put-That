# WDIPT — Phase 1–2 implementation

Status: implemented locally and validated. The mobile/desktop home redesign and the simplified add-memory modal are **out of scope** for this handoff (phases 3–5). Full final validation after later phases remains phase 6.

## Phase 1: account preferences and optional saved place coordinates

- Migration: `drizzle/0004_add_privacy_preferences_and_location_coords.sql`.
- The authenticated user's preferences are stored on the `users` row:
  - `location_mode`: `off`, `ask` (default), `approximate`, `precise`
  - `microphone_enabled`: `on` (default) / `off`
  - `speech_language`: `auto` (default), `no`, `en`.
- Settings → **Location and microphone** offers the controls. The API only updates preferences for the current authenticated user. All devices see the same preferences on their next load; the browser's actual OS-level permissions remain per-device.
- When microphone is off, speech buttons are disabled. The microphone never starts automatically.
- Location `off` blocks new GPS lookups, including memory pins. `ask` requires an explicit action. `approximate` and `precise` permit one-time lookup while resolving an ambiguous place, never background tracking.
- An explicit action in the location editor can save coordinates on a place. Places may have `latitude`, `longitude` and `geo_precision`. Only the user can request capture or remove saved coordinates. Existing free-text addresses are **not** automatically geocoded.
- An individual memory's map pin is separate from the saved place coordinates. Merely obtaining location for a suggestion cannot set a memory map pin.
- Approximate coordinates are deliberately rounded to two decimals before returning to the application. Every browser can still deny access regardless of preference.

## Phase 2: suggestions before saving

- `lib/memory-suggestions.ts` parses Norwegian/English declarative sentences and matches an explicitly named place against saved place paths; it does not call an AI service.
- If exactly one path is more convincing than alternatives, the existing create/edit form auto-populates the item and saved location ID. If the match is ambiguous, it does **not** pick one silently; the user chooses among candidates.
- Optional current-position proximity is a ranking signal only where a matching saved location/ancestor has coordinates. Accuracy and approximate precision matter. An ambiguous tie remains ambiguous.
- `components/structured-memory-form.tsx` exposes a minimal text/voice input and suggestions **inside the existing form**, without implementing the phase 3 modal redesign. It preserves a manual override and always uses the existing confirmation step.
- The same recognition grammar is used for text and browser speech transcription. Browser speech support and permissions vary.
- `app/api/memories/route.ts` accepts a known, owned `locationId` (instead of guessing by a new string path) and returns an error for foreign location IDs.
- No new external services, background polling, API subscriptions or other monetary cost.

## Validation and rollout

- `pnpm run test:suggestions` tests hierarchy disambiguation, exact/approximate proximity, poor accuracy, and non-invention.
- `pnpm run test:recognition` tests aliases, item categories, and typos.
- TypeScript, targeted ESLint, production build, local Wrangler migrations, auth-isolated API smoke tests and browser smoke tests are required before committing.
- **Migration order matters**: apply 0004 to remote D1 **before** publishing code that attempts to save the new columns. The existing GitHub Actions migration workflow triggers when `drizzle/**` is pushed to main. Two separate commits/pushes (migration first, verified, then application code) prevent a deployment race.
- Do not run remote migrations while local validation is in progress. Remote production verification remains after a manually authorized push.
