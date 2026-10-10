# Google profile dropdown refinement

## Owner-approved design

The top-right account menu should show the Google profile cleanly, on both
desktop and mobile:

- A 39px circular account photo (or first-letter fallback), a prominent
  account name, and a muted, single-line email address.
- The full email remains accessible as a title attribute. Long addresses
  are visually truncated with an ellipsis, never modified.
- A persistent NO/EN language toggle styled like an iOS switch in WDIPT
  sage green. Its state follows the currently selected interface language.
  Mouse, touch, Space/Enter and screen-reader interaction use the shared
  accessible Radix Switch component. Changing languages stores the existing
  localStorage preference and does not close the dropdown.
- No redundant Settings action in the account dropdown; Settings remains
  visible in the permanent application navigation.
- Sign out is a separate softly red action; the existing server-side
  POST /auth/logout stays unchanged in Google mode.
- A quiet sage-green border defines the dropdown without changing the
  global app palette. Reduced-motion preferences remove switch transitions.

## Implementation

- `components/profile-menu.tsx`: extracted reusable profile dropdown.
- `app/memory-app.tsx`: plugs the dropdown into the existing profile button
  and preserves its outside-click / Escape close handling.
- `app/globals.css`: scoped design tokens, switch states, logout colors
  and responsive width.

No new npm dependencies, back-end changes, database migrations or
authentication-provider configuration are needed.

## Validation

Run TypeScript, targeted ESLint, existing recognition / suggestion /
typewriter and Google authentication unit tests, and `pnpm run build`.

Browser QA should cover menu border, photo/name/email layout, long-email
ellipsis, NO/EN toggle in both directions, language persistence after
reload, Escape and outside-click dismissal, absence of Settings in dropdown,
sign-out form target, mobile 320/390px and desktop 1440px without overflow.

The production Google session and logout still require a user test after
the changes are committed, pushed and deployed.
