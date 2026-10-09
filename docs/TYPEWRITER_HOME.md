# One-time typewriter heading on Home entry

## Design and scope

The previous static “Appen som husker for deg.” / “The app that remembers for you.”
heading is replaced on both desktop and mobile by one animated, localized headline.
No subtitle is rendered between the heading and the two primary action cards.
The existing sage/cream design remains; heading icons come exclusively from
the existing `lucide-react` package and use the same sage green as the UI.

The redundant desktop top-left breadcrumb has been removed. The left sidebar
remains the sole desktop navigation, and the profile menu remains at top right.
The mobile header and three-tab bottom navigation remain unchanged.

## Selection rules

- Twelve stable sentences for each language, plus one generic greeting and
  a time-appropriate morning / afternoon / evening / late-night greeting.
- The first name appears in greetings only if a proper display name was
  returned by the app. The account's email is never shown in greeting copy.
- Dynamic phrases use up to five **distinct, successfully found item names**
  from recent searches. Raw spoken queries, searches with zero or multiple
  results, and the location of the item are never stored by this feature.
- Recent found item names are stored only in localStorage, namespaced
  per account. They are not sent to any new service or synchronized between
  devices. They are cleared on memory/account bulk removal, or individually
  when the underlying item is deleted.
- A localStorage shuffle bag is preserved across reloads and visits to Home.
  One new eligible headline is drawn when the page loads or the user
  navigates back to Home from Memory Bank / Settings. Each eligible headline
  is used once per shuffled cycle, without immediate repetition.
  Simply opening a search dialog, recording, or returning from a modal
  **does not** count as a new Home visit.
- Greetings are filtered by the local clock. Language switching translates
  the current headline without consuming another shuffle-bag entry.
  Navigating away to Memory Bank or Settings and then back to Home
  **does** select and type a new headline.

## Motion and accessibility

- Typing: 55 ms per Unicode code point, **once per Home visit**.
  After the final character, the headline stays fully visible indefinitely;
  it is never deleted, replaced by a timer, or retyped automatically.
  The blinking caret is only present during the initial typing.
- The animated area has a reserved fixed height; the primary action cards
  retain equal height and do not jump between phrases.
- Unfinished typing pauses while the app is off Home, during searching /
  recording / a modal, or while the page is in the background. Only navigating
  away from Home and back starts a new heading.
- The accessible heading exposes the full phrase to screen readers,
  rather than announcing partial characters. The Lucide icon is decorative.
- With `prefers-reduced-motion: reduce`, the full phrase appears immediately
  without typing, deleting or blinking. A new phrase only appears on the next
  Home visit or reload, just like the standard motion setting.

## Files

- `lib/home-prompts.ts`: wording, contextual templates, local search
  history, shuffle selection, persistence parsing.
- `components/use-home-headline.ts`: client timing and lifecycle.
- `components/typewriter-heading.tsx`: accessible Lucide heading rendering.
- `components/mobile-home.tsx`: the shared heading and two action cards.
- `app/memory-app.tsx`: local account display name, search successes,
  input data wiring, deletion housekeeping and desktop breadcrumb removal.
- `app/globals.css`: responsive fixed-height heading and caret.
- `tests/home-prompts.test.mjs`: deterministic shuffle and localization tests.

## Validation

Run:
```text
node --experimental-strip-types --test tests/home-prompts.test.mjs
pnpm run test:suggestions
pnpm run test:recognition
pnpm exec tsc --noEmit
pnpm exec eslint app/memory-app.tsx components/mobile-home.tsx components/typewriter-heading.tsx components/use-home-headline.ts lib/home-prompts.ts --rule '@typescript-eslint/no-explicit-any: off' --quiet
pnpm run build
```

Check the built app at 320, 390, 761, 930, 1051 and 1440 px, including
new headline on each reload and Home navigation, no timed rotation after
completion, translation, reduced motion, the profile menu,
desktop sidebar, lack of duplicate breadcrumb, search and voice, and stable
card positioning. After the user commits and pushes, verify the deployed
iPhone and desktop app; browser-mocked microphone checks do not prove
native iOS speech permission behavior.
