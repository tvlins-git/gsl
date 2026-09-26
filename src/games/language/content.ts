import type { LearningLanguage } from '../types';

export type LetterCard = {
  id: string;
  glyph: string;
  spoken: string;
};

export type WordCard = {
  id: string;
  word: string;
  picture: string;
};

export type StoryCard = {
  id: string;
  sentences: readonly [string] | readonly [string, string];
  picture: string;
};

export type LanguagePack = {
  letters: readonly LetterCard[];
  words: readonly WordCard[];
  stories: readonly StoryCard[];
};

export type UiCopy = {
  alphabetTitle: string;
  whichSound: string;
  listen: string;
  great: string;
  thatWas: string;
  next: string;
  wordTitle: string;
  sayTheWord: string;
  listening: string;
  showPicture: string;
  tryAgain: string;
  hearIt: string;
  canSeePicture: string;
  hereItIs: string;
  storyTitle: string;
  readAloud: string;
  iReadIt: string;
  niceReading: string;
};

function picture(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="100%" height="100%" aria-hidden="true">${body}</svg>`;
}

const pictures = {
  sun: picture(`
    <circle cx="80" cy="80" r="28" fill="#FFC43D"/>
    <g stroke="#FFC43D" stroke-width="8" stroke-linecap="round">
      <path d="M80 18v20M80 122v20M18 80h20M122 80h20"/>
      <path d="M34 34l14 14M112 112l14 14M126 34l-14 14M48 112l-14 14"/>
    </g>
  `),
  cat: picture(`
    <ellipse cx="80" cy="112" rx="42" ry="28" fill="#F4A261"/>
    <circle cx="80" cy="74" r="32" fill="#F4A261"/>
    <path d="M52 64 L42 28 L74 52 Z" fill="#F4A261"/>
    <path d="M108 64 L118 28 L86 52 Z" fill="#F4A261"/>
    <path d="M54 58 L48 36 L70 52 Z" fill="#F8D7BE"/>
    <path d="M106 58 L112 36 L90 52 Z" fill="#F8D7BE"/>
    <circle cx="68" cy="74" r="5" fill="#243047"/>
    <circle cx="92" cy="74" r="5" fill="#243047"/>
    <path d="M80 82 L74 92 H86 Z" fill="#E76F51"/>
    <path d="M72 96 Q80 104 88 96" fill="none" stroke="#243047" stroke-width="3" stroke-linecap="round"/>
    <path d="M46 86 H24 M46 96 H20 M114 86 H136 M114 96 H140" stroke="#243047" stroke-width="3" stroke-linecap="round"/>
  `),
  dog: picture(`
    <ellipse cx="80" cy="116" rx="40" ry="26" fill="#C4844A"/>
    <circle cx="80" cy="72" r="34" fill="#E0A15A"/>
    <ellipse cx="44" cy="80" rx="16" ry="24" fill="#C4844A"/>
    <ellipse cx="116" cy="80" rx="16" ry="24" fill="#C4844A"/>
    <ellipse cx="80" cy="86" rx="16" ry="12" fill="#F3D2A4"/>
    <circle cx="66" cy="66" r="5" fill="#243047"/>
    <circle cx="94" cy="66" r="5" fill="#243047"/>
    <circle cx="80" cy="86" r="4" fill="#243047"/>
    <path d="M74 96 Q80 110 92 98" fill="#E76F51"/>
  `),
  car: picture(`
    <rect x="24" y="78" width="112" height="36" rx="14" fill="#EF476F"/>
    <path d="M46 78 L62 50 H108 L122 78 Z" fill="#EF476F"/>
    <rect x="66" y="54" width="36" height="20" rx="4" fill="#D7F3FF"/>
    <circle cx="50" cy="116" r="14" fill="#243047"/>
    <circle cx="50" cy="116" r="6" fill="#F8F4EC"/>
    <circle cx="112" cy="116" r="14" fill="#243047"/>
    <circle cx="112" cy="116" r="6" fill="#F8F4EC"/>
  `),
  fish: picture(`
    <ellipse cx="74" cy="84" rx="40" ry="24" fill="#4CC9F0"/>
    <polygon points="114,84 146,58 146,110" fill="#4895EF"/>
    <circle cx="54" cy="78" r="5" fill="#243047"/>
    <path d="M66 98 Q82 108 98 96" fill="none" stroke="#243047" stroke-width="3" stroke-linecap="round"/>
  `),
  moon: picture(`
    <path d="M100 28 A42 42 0 1 0 100 136 A30 30 0 1 1 100 28 Z" fill="#FFE08A"/>
  `),
  hat: picture(`
    <ellipse cx="80" cy="112" rx="54" ry="14" fill="#6D597A"/>
    <rect x="50" y="46" width="60" height="62" rx="16" fill="#9B5DE5"/>
    <rect x="50" y="90" width="60" height="16" fill="#6D597A"/>
  `),
  tree: picture(`
    <rect x="70" y="98" width="20" height="40" rx="6" fill="#C4844A"/>
    <circle cx="80" cy="76" r="36" fill="#7BD389"/>
    <circle cx="56" cy="92" r="22" fill="#5EBE74"/>
    <circle cx="106" cy="90" r="24" fill="#8FE39A"/>
  `),
  bee: picture(`
    <ellipse cx="56" cy="70" rx="16" ry="10" fill="#E7F6FF"/>
    <ellipse cx="104" cy="70" rx="16" ry="10" fill="#E7F6FF"/>
    <ellipse cx="80" cy="90" rx="28" ry="22" fill="#FFD60A"/>
    <path d="M68 70 V110 M80 68 V112 M92 70 V110" stroke="#243047" stroke-width="6" stroke-linecap="round"/>
    <circle cx="80" cy="58" r="12" fill="#243047"/>
    <circle cx="76" cy="56" r="2" fill="#ffffff"/>
    <circle cx="86" cy="56" r="2" fill="#ffffff"/>
  `),
  book: picture(`
    <path d="M28 40 H80 V128 H28 Q42 116 28 40 Z" fill="#EF476F"/>
    <path d="M132 40 H80 V128 H132 Q118 116 132 40 Z" fill="#F78C6B"/>
    <path d="M80 40 V128" stroke="#243047" stroke-width="3"/>
    <path d="M40 58 H70 M40 72 H66 M92 58 H120 M94 72 H120" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
  `),
};

const scenes = {
  catSun: picture(`
    <rect width="160" height="160" rx="24" fill="#E7F6FF"/>
    <circle cx="124" cy="36" r="16" fill="#FFC43D"/>
    <g stroke="#FFC43D" stroke-width="4" stroke-linecap="round">
      <path d="M124 12v8M124 52v8M100 36h8M140 36h8"/>
    </g>
    <rect y="122" width="160" height="38" fill="#95D5B2"/>
    <ellipse cx="62" cy="118" rx="28" ry="16" fill="#F4A261"/>
    <circle cx="62" cy="92" r="20" fill="#F4A261"/>
    <path d="M46 86 L40 64 L58 80 Z" fill="#F4A261"/>
    <path d="M78 86 L84 64 L66 80 Z" fill="#F4A261"/>
    <circle cx="54" cy="92" r="3" fill="#243047"/>
    <circle cx="70" cy="92" r="3" fill="#243047"/>
    <path d="M62 98 L58 104 H66 Z" fill="#E76F51"/>
  `),
  dog: picture(`
    <rect width="160" height="160" rx="24" fill="#E7F6FF"/>
    <rect y="122" width="160" height="38" fill="#95D5B2"/>
    <circle cx="118" cy="108" r="12" fill="#EF476F"/>
    <ellipse cx="70" cy="116" rx="30" ry="16" fill="#C4844A"/>
    <circle cx="74" cy="86" r="24" fill="#E0A15A"/>
    <ellipse cx="50" cy="92" rx="10" ry="16" fill="#C4844A"/>
    <ellipse cx="98" cy="92" rx="10" ry="16" fill="#C4844A"/>
    <circle cx="66" cy="84" r="3" fill="#243047"/>
    <circle cx="84" cy="84" r="3" fill="#243047"/>
    <ellipse cx="75" cy="96" rx="8" ry="6" fill="#F3D2A4"/>
    <path d="M70 100 Q75 108 82 100" fill="#E76F51"/>
  `),
  car: picture(`
    <rect width="160" height="160" rx="24" fill="#E7F6FF"/>
    <circle cx="126" cy="36" r="14" fill="#FFC43D"/>
    <rect y="118" width="160" height="42" fill="#C5D0DC"/>
    <rect y="132" width="160" height="8" fill="#ffffff" opacity="0.7"/>
    <rect x="28" y="86" width="100" height="30" rx="10" fill="#EF476F"/>
    <path d="M48 86 L60 64 H100 L112 86 Z" fill="#EF476F"/>
    <rect x="64" y="68" width="30" height="16" rx="3" fill="#D7F3FF"/>
    <circle cx="50" cy="118" r="12" fill="#243047"/>
    <circle cx="50" cy="118" r="5" fill="#F8F4EC"/>
    <circle cx="108" cy="118" r="12" fill="#243047"/>
    <circle cx="108" cy="118" r="5" fill="#F8F4EC"/>
  `),
};

export const icons = {
  speaker: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="36" height="36" aria-hidden="true"><path fill="currentColor" d="M8 18h8l10-8v28L16 30H8V18z"/><path fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" d="M32 18c3 3 3 9 0 12M36 14c6 5 6 15 0 20"/></svg>`,
  mic: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="36" height="36" aria-hidden="true"><rect x="18" y="6" width="12" height="22" rx="6" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" d="M12 22a12 12 0 0 0 24 0M24 34v8M16 42h16"/></svg>`,
};

export const gameCss = `
.pip-game {
  box-sizing: border-box;
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  min-height: 100%;
  padding: 28px 20px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
  color: #243047;
  background: linear-gradient(180deg, #fff4c8 0%, #d9f3ff 55%, #e7ffe8 100%);
  font-family: "Avenir Next", "Trebuchet MS", "Segoe UI", sans-serif;
  text-align: center;
}
.pip-game *, .pip-game *::before, .pip-game *::after { box-sizing: border-box; }
.pip-kicker {
  margin: 0;
  padding: 8px 18px;
  border-radius: 999px;
  background: #ffffff;
  font-size: 18px;
  font-weight: 800;
}
.pip-title {
  margin: 0;
  min-height: 1.2em;
  font-size: 36px;
  line-height: 1.2;
  font-weight: 800;
}
.pip-glyph {
  display: block;
  margin-top: 4px;
  font-size: 72px;
  line-height: 1;
}
.pip-word {
  margin: 0;
  font-size: 84px;
  line-height: 0.95;
  font-weight: 800;
}
.pip-story {
  margin: 0;
  max-width: 16em;
  font-size: 34px;
  line-height: 1.35;
  font-weight: 800;
}
.pip-hint {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
}
.pip-stars {
  margin: 0;
  color: #f4a261;
  font-size: 28px;
  letter-spacing: 0.2em;
}
.pip-letters, .pip-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  width: 100%;
}
.pip-letter, .pip-action, .pip-next {
  border: 0;
  cursor: pointer;
  font: inherit;
  font-weight: 800;
  color: #243047;
  touch-action: manipulation;
}
.pip-letter {
  width: 112px;
  height: 112px;
  border-radius: 28px;
  background: #ffffff;
  font-size: 64px;
  box-shadow: 0 8px 0 #f0c14a;
}
.pip-letter:active { transform: translateY(4px); box-shadow: 0 4px 0 #f0c14a; }
.pip-letter.is-yes { background: #b8f2c8; box-shadow: 0 8px 0 #67c587; }
.pip-letter.is-pick { box-shadow: 0 8px 0 #7eb6f0; }
.pip-letter:disabled { cursor: default; }
.pip-action {
  min-width: 188px;
  min-height: 88px;
  padding: 16px 28px;
  border-radius: 999px;
  background: #ff7a59;
  color: #ffffff;
  font-size: 30px;
  box-shadow: 0 8px 0 #e15a3c;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.pip-action.is-listen { background: #3d8bfd; box-shadow: 0 8px 0 #2468d4; }
.pip-action:active { transform: translateY(4px); }
.pip-action:disabled { cursor: default; opacity: 0.85; }
.pip-next {
  min-width: 168px;
  min-height: 72px;
  padding: 12px 28px;
  border-radius: 999px;
  background: #ffe08a;
  font-size: 28px;
  box-shadow: 0 6px 0 #f0c14a;
}
.pip-next:active { transform: translateY(3px); box-shadow: 0 3px 0 #f0c14a; }
.pip-stage {
  width: min(100%, 280px);
  aspect-ratio: 1;
  border-radius: 32px;
  background: #ffffff;
  display: grid;
  place-items: center;
  box-shadow: 0 10px 0 #d7ecff;
  overflow: hidden;
}
.pip-stage.is-wide { width: min(100%, 320px); }
.pip-mystery {
  margin: 0;
  font-size: 96px;
  line-height: 1;
  font-weight: 800;
  color: #b9c6d6;
}
.pip-icon { width: 36px; height: 36px; display: inline-flex; }
.pip-icon svg { width: 100%; height: 100%; display: block; }
.pip-game button:focus-visible { outline: 4px solid #243047; outline-offset: 3px; }
.pip-listening { animation: pip-bob 0.8s ease-in-out infinite; }
@keyframes pip-bob {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}
@media (max-width: 420px) {
  .pip-word { font-size: 64px; }
  .pip-title { font-size: 30px; }
  .pip-story { font-size: 28px; }
  .pip-letter { width: 96px; height: 96px; font-size: 52px; }
}
`;

const DANISH_LETTERS = 'abcdefghijklmnopqrstuvwxyzæøå';
const SWEDISH_LETTERS = 'abcdefghijklmnopqrstuvwxyzåäö';
const ENGLISH_LETTERS = 'abcdefghijklmnopqrstuvwxyz';

const DANISH_LETTER_NAMES: Record<string, string> = {
  a: 'a',
  b: 'be',
  c: 'se',
  d: 'de',
  e: 'e',
  f: 'æf',
  g: 'ge',
  h: 'hå',
  i: 'i',
  j: 'jåd',
  k: 'kå',
  l: 'æl',
  m: 'æm',
  n: 'æn',
  o: 'o',
  p: 'pe',
  q: 'ku',
  r: 'ær',
  s: 'æs',
  t: 'te',
  u: 'u',
  v: 've',
  w: 'dobbelt-v',
  x: 'eks',
  y: 'y',
  z: 'sæt',
  æ: 'æ',
  ø: 'ø',
  å: 'å',
};

const SWEDISH_LETTER_NAMES: Record<string, string> = {
  a: 'a',
  b: 'be',
  c: 'se',
  d: 'de',
  e: 'e',
  f: 'eff',
  g: 'ge',
  h: 'hå',
  i: 'i',
  j: 'ji',
  k: 'kå',
  l: 'ell',
  m: 'em',
  n: 'en',
  o: 'o',
  p: 'pe',
  q: 'ku',
  r: 'ärr',
  s: 'ess',
  t: 'te',
  u: 'u',
  v: 've',
  w: 'dubbel-v',
  x: 'eks',
  y: 'y',
  z: 'säta',
  å: 'å',
  ä: 'ä',
  ö: 'ö',
};

const ENGLISH_LETTER_NAMES: Record<string, string> = {
  a: 'ay',
  b: 'bee',
  c: 'see',
  d: 'dee',
  e: 'ee',
  f: 'ef',
  g: 'gee',
  h: 'aitch',
  i: 'eye',
  j: 'jay',
  k: 'kay',
  l: 'el',
  m: 'em',
  n: 'en',
  o: 'oh',
  p: 'pee',
  q: 'cue',
  r: 'ar',
  s: 'ess',
  t: 'tee',
  u: 'you',
  v: 'vee',
  w: 'double you',
  x: 'ex',
  y: 'why',
  z: 'zee',
};

function lettersFor(language: LearningLanguage, glyphs: string): LetterCard[] {
  const names =
    language === 'da'
      ? DANISH_LETTER_NAMES
      : language === 'sv'
        ? SWEDISH_LETTER_NAMES
        : ENGLISH_LETTER_NAMES;
  return [...glyphs].map((glyph) => ({
    id: `alphabet:${language}:${glyph}`,
    glyph,
    spoken: names[glyph] ?? glyph,
  }));
}

function wordCard(language: LearningLanguage, word: string, svg: string): WordCard {
  return {
    id: `word:${language}:${word}`,
    word,
    picture: svg,
  };
}

function storyCard(
  language: LearningLanguage,
  slug: string,
  sentences: [string] | [string, string],
  svg: string,
): StoryCard {
  return {
    id: `story:${language}:${slug}`,
    sentences,
    picture: svg,
  };
}

const wordRows: readonly (readonly [string, string, string, string])[] = [
  ['sol', 'sol', 'sun', pictures.sun],
  ['kat', 'katt', 'cat', pictures.cat],
  ['hund', 'hund', 'dog', pictures.dog],
  ['bil', 'bil', 'car', pictures.car],
  ['fisk', 'fisk', 'fish', pictures.fish],
  ['måne', 'måne', 'moon', pictures.moon],
  ['hat', 'hatt', 'hat', pictures.hat],
  ['træ', 'träd', 'tree', pictures.tree],
  ['bi', 'bi', 'bee', pictures.bee],
  ['bog', 'bok', 'book', pictures.book],
];

function wordsFor(language: LearningLanguage): WordCard[] {
  const column = language === 'da' ? 0 : language === 'sv' ? 1 : 2;
  return wordRows.map((row) => wordCard(language, row[column], row[3]));
}

export const uiCopy: Record<LearningLanguage, UiCopy> = {
  da: {
    alphabetTitle: 'Bogstaver',
    whichSound: 'Hvilken lyd var det?',
    listen: 'Lyt',
    great: 'Så dygtigt!',
    thatWas: 'Det var',
    next: 'Næste',
    wordTitle: 'Ord',
    sayTheWord: 'Sig ordet',
    listening: 'Lytter',
    showPicture: 'Vis billedet',
    tryAgain: 'Prøv igen',
    hearIt: 'Hør det',
    canSeePicture: 'Du kan se billedet',
    hereItIs: 'Her er billedet',
    storyTitle: 'Historie',
    readAloud: 'Læs op',
    iReadIt: 'Jeg læste',
    niceReading: 'Så fint læst!',
  },
  sv: {
    alphabetTitle: 'Bokstäver',
    whichSound: 'Vilket ljud var det?',
    listen: 'Lyssna',
    great: 'Så bra!',
    thatWas: 'Det var',
    next: 'Nästa',
    wordTitle: 'Ord',
    sayTheWord: 'Säg ordet',
    listening: 'Lyssnar',
    showPicture: 'Visa bilden',
    tryAgain: 'Försök igen',
    hearIt: 'Hör det',
    canSeePicture: 'Du kan se bilden',
    hereItIs: 'Här är bilden',
    storyTitle: 'Saga',
    readAloud: 'Läs högt',
    iReadIt: 'Jag läste',
    niceReading: 'Så fint läst!',
  },
  en: {
    alphabetTitle: 'Letters',
    whichSound: 'Which sound was that?',
    listen: 'Listen',
    great: 'You did it!',
    thatWas: 'That was',
    next: 'Next',
    wordTitle: 'Words',
    sayTheWord: 'Say the word',
    listening: 'Listening',
    showPicture: 'Show the picture',
    tryAgain: 'Try again',
    hearIt: 'Hear it',
    canSeePicture: 'You can see the picture',
    hereItIs: 'Here is the picture',
    storyTitle: 'Story',
    readAloud: 'Read aloud',
    iReadIt: 'I read it',
    niceReading: 'Nice reading!',
  },
};

function storiesFor(language: LearningLanguage): StoryCard[] {
  if (language === 'da') {
    return [
      storyCard(language, 'cat-sun', ['Se katten.', 'Se solen.'], scenes.catSun),
      storyCard(language, 'dog', ['Hunden er glad.'], scenes.dog),
      storyCard(language, 'car', ['Se bilen.', 'Den er rød.'], scenes.car),
    ];
  }
  if (language === 'sv') {
    return [
      storyCard(language, 'cat-sun', ['Se katten.', 'Se solen.'], scenes.catSun),
      storyCard(language, 'dog', ['Hunden är glad.'], scenes.dog),
      storyCard(language, 'car', ['Se bilen.', 'Den är röd.'], scenes.car),
    ];
  }
  return [
    storyCard(language, 'cat-sun', ['See the cat.', 'See the sun.'], scenes.catSun),
    storyCard(language, 'dog', ['The dog is glad.'], scenes.dog),
    storyCard(language, 'car', ['See the car.', 'It is red.'], scenes.car),
  ];
}

export const languageContent: Record<LearningLanguage, LanguagePack> = {
  da: {
    letters: lettersFor('da', DANISH_LETTERS),
    words: wordsFor('da'),
    stories: storiesFor('da'),
  },
  sv: {
    letters: lettersFor('sv', SWEDISH_LETTERS),
    words: wordsFor('sv'),
    stories: storiesFor('sv'),
  },
  en: {
    letters: lettersFor('en', ENGLISH_LETTERS),
    words: wordsFor('en'),
    stories: storiesFor('en'),
  },
};
