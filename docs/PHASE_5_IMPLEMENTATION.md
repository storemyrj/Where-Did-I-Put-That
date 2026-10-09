# Phase 5 — Desktop home and Memory Bank

## Scope

Phase 5 implements the approved desktop layout using the same action-card components,
search and memory dialogs, data sources, and account preferences already used by mobile.
Phase 6 (whole-project acceptance and deployed-device verification) is separate.

### Home

- Two equal-sized Find and Remember cards share the implementation with the mobile home.
- Clicking a card opens the corresponding dialog; clicking its microphone starts recognition
  within the same user gesture and preserves the iOS dialog focus protection.
- An introductory heading and a short explanation replace the old desktop-only search panel.
- Below the cards, Home shows **up to six most recently updated** memories, sorted by
  `updated_at` (descending), with a **See all** action opening the full Memory Bank.
- The Home view does not offer redundant location filters or a duplicate Add card.
- Search results still appear on Home with the existing result-card interactions.
- Sample memories, onboarding, empty states, moving items and history are retained.

### Desktop navigation update (October 2026)

The owner subsequently approved replacing the fixed left sidebar with a
**horizontal top bar inspired by the existing mobile bottom navigation**.
The brand is at the left, the shared icon-over-label Home / Memory Bank /
Settings navigation is centered relative to the viewport, and the existing
profile button remains at the far right. The very same `AppNavigation`
component renders the desktop menu and mobile bottom menu, with responsive
placement only; active navigation state, labels and callbacks are shared.
The tagline previously under the desktop logo and the two decorative footer
statements are removed from the rendered interface. No new navigation route,
user data or back-end service is introduced.

The desktop content container is widened and more evenly spaced, and the
shared action cards use two columns from 850px upward. Between 761px and
849px they stack for legibility; <=760px retains mobile entry and bottom
navigation. Desktop icon labels remain permanently visible (no hover-only
navigation). The header keeps the profile popup accessible and the title
animation unchanged.

### Memory Bank

- Desktop top navigation: Home / Memory Bank / Settings, using the same
  component and visual design as the mobile bottom navigation.
- Memory Bank shows the full set of saved items, the existing location filters and
  edit/detail/history flows, plus a Remember action.
- Moving from Home to Memory Bank resets the location filter to All memories.
- No API or D1 schema changes are required.

### Responsive behavior

- Desktop widths of 850px and above show two equal-width, equal-height actions in a row.
- Narrow desktop/tablet widths of 761–849px stack the shared cards to keep
  their controls readable.
- Widths of 760px and below preserve the existing two large mobile cards and
  Home / Memory Bank / Settings bottom navigation.
- The same dialogs are used everywhere; desktop dialogs receive additional width
  and spacing, while mobile dialogs retain their original sizing and autofocus behavior.
- Sage/cream tokens, saved photos, privacy preferences and speech behavior remain unchanged.

## Validation / release

Run `pnpm run test:suggestions`, `pnpm run test:recognition`,
`node --experimental-strip-types --test tests/home-prompts.test.mjs`,
`pnpm exec tsc --noEmit`, targeted ESLint, `pnpm run build`, and focused browser
checks at mobile, tablet and desktop sizes covering navigation, newest-six sorting,
filters, search (text/voice), create/edit/history, image preview and confirmation.
The project-wide lint baseline contains pre-existing `no-explicit-any` debt.
Do not classify deployment or physical iPhone microphone verification as completed
until independently checked after the owner pushes the commit.

No new migrations. Commit the Phase 5 changes together. Desktop redesign is a
local implementation until the deployed version is verified.
