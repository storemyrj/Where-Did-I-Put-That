# Rotating typewriter home heading

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
- A localStorage shuffle bag is preserved across reloads and page visits.
  Each eligible headline is used once per shuffled cycle; a completed
  cycle explicitly avoids repeating the immediately previous headline.
  On each page reload, a new sentence is chosen without showing the
  previous hard-coded heading while loading.
- Greetings are filtered by the local clock. When the language changes,
  the currently selected headline is translated without consuming an
  additional shuffle-bag entry. Going to Memory Bank / Settings and
  returning to Home continues the current headline without a reset.

## Motion and accessibility

- Typing: 55 ms per Unicode code point. Full phrase hold: four seconds.
  Deletion: 25 ms per code point. A small blinking caret accompanies typing.
- The animated area has a reserved fixed height; the primary action cards
  retain equal height and do not jump between phrases.
- Motion pauses while the app is off Home, while searching / recording /
  showing a modal, and while the page is in the background.
- The accessible heading exposes the full phrase to screen readers,
  rather than announcing partial characters. The Lucide icon is decorative.
- With `prefers-reduced-motion: reduce`, the full phrase appears
  immediately without typing, deleting or blinking, and rotates less often.

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
new headline on each reload, translation, reduced motion, the profile menu,
desktop sidebar, lack of duplicate breadcrumb, search and voice, and stable
card positioning. After the user commits and pushes, verify the deployed
iPhone and desktop app; browser-mocked microphone checks do not prove
native iOS speech permission behavior.
