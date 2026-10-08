export type AppLanguage = 'no' | 'en';

export const copy = {
  no: {
    tellMe: 'Fortell meg',
    typeHere: 'eller skriv her',
    rememberStarts: 'Huskingen starter her',
    examplePassport: 'Jeg la passet mitt i den øverste skuffen på soverommet.',
    exampleMove: 'Jeg flyttet den til sekken min.',
    help: 'Bare tingen og stedet. Jeg finner ut resten.',
    lastTold: 'Det er det siste stedet du fortalte meg. 👌',
    today: 'i dag',
    yesterday: 'i går',
  },
  en: {
    tellMe: 'Tell me',
    typeHere: 'or type it here',
    rememberStarts: 'Remembering starts here',
    examplePassport: 'I put my passport in the top drawer in my bedroom.',
    exampleMove: 'I moved it to my backpack.',
    help: 'Just the item and its location. We’ll take it from there.',
    lastTold: 'That’s the last place you told me. 👌',
    today: 'today',
    yesterday: 'yesterday',
  },
} as const;

export function text(language: AppLanguage, key: keyof typeof copy.no) {
  return copy[language][key];
}
