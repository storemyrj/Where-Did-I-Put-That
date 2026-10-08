# Item name recognition

The app resolves Norwegian/English item-name variants **locally**, without an AI API, external service or cost.

## Single source of truth

- `lib/item-recognition.ts` defines categories, icons, aliases, bounded typo matching and search.
- `lib/memory.ts` re-exports `emoji()` and `searchMemories()` so existing voice, item cards and search use the same rules.
- The original item name is never modified or overwritten by recognition.
- A user's manually chosen icon takes precedence over the automatic icon.
- Accessories win over the parent device: `PC-lader` is a charger, `PC-veske` is a bag, `PC-en` is a computer.
- Typo matching is limited to **one character**, requires a known alias of at least five characters and must resolve unambiguously to one category. Short names are not auto-corrected.

## Adding a new synonym or category

1. Open `ITEM_CATEGORIES` in `lib/item-recognition.ts`. Put a new alias in the appropriate category; include common Norwegian inflections and English forms. For a new category, add its ID to `ItemCategory` and choose an icon.
2. Place accessory categories ahead of their parent objects in `ITEM_CATEGORIES` when the item name may contain both words.
3. Add a positive example and a negative/ambiguous example to `tests/item-recognition.test.mjs`.
4. Run `pnpm run test:recognition`, then TypeScript, targeted ESLint and `pnpm run build`.
5. Check the actual app after deployment using search, automatic icon suggestions and a manually overridden icon.

Avoid broad substring rules that make e.g. `PC` match `PC-lader`. When wording is ambiguous, returning fewer matches is safer than silently guessing. Users can choose an icon manually.

## Photo preview

`components/photo-picker.tsx` provides the same take/choose/retake/remove preview in the new-item form and the save-confirmation view. It displays a temporary `blob:` URL on the user's device; the image is **not** uploaded until the user confirms the memory. Object URLs are revoked when replaced or the component unmounts. Both client and server restrict supported files to JPG, PNG and WebP under 5 MB.

The preview does not replace a final verification on a mobile camera and photo library.
