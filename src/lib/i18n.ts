import type { LearningLanguage } from "@/games/types";

export const LANGUAGES: LearningLanguage[] = ["sv", "da", "en"];

const copy = {
  sv: {
    math: "Matte",
    language: "Språk",
    letters: "Bokstäver",
    words: "Ord",
    stories: "Sagor",
    inARow: "i rad",
    stars: "stjärnor",
    hello: "Hej",
    back: "Tillbaka",
    grownUp: "Vuxen",
    signOut: "Logga ut",
    signOutHint: "Koden behövs för att öppna spelet igen.",
    firstTime: "Första gången",
    haveCode: "Vi har en kod",
    herName: "Hennes namn",
    familyCode: "Familjekod",
    start: "Starta",
    saveCode: "Jag har sparat koden",
    codeHelp: "Spara koden. Samma kod öppnar hennes stjärnor på en annan enhet.",
    keepGoing: "Fortsätt",
    placeholder: "Spelet kommer snart.",
    preview:
      "Databasen är inte kopplad än. Poängen stannar i den här webbläsaren.",
    wrongCode: "Koden stämde inte.",
    needName: "Skriv hennes namn.",
    shortCode: "Koden behöver minst 6 tecken.",
    tripped: "Pip snubblade. Försök igen.",
  },
  da: {
    math: "Matematik",
    language: "Sprog",
    letters: "Bogstaver",
    words: "Ord",
    stories: "Historier",
    inARow: "i træk",
    stars: "stjerner",
    hello: "Hej",
    back: "Tilbage",
    grownUp: "Voksen",
    signOut: "Log ud",
    signOutHint: "Koden skal bruges for at åbne spillet igen.",
    firstTime: "Første gang",
    haveCode: "Vi har en kode",
    herName: "Hendes navn",
    familyCode: "Familiekode",
    start: "Start",
    saveCode: "Jeg har gemt koden",
    codeHelp: "Gem koden. Den samme kode åbner hendes stjerner på en anden enhed.",
    keepGoing: "Videre",
    placeholder: "Spillet er på vej.",
    preview:
      "Databasen er ikke forbundet endnu. Pointene bliver i denne browser.",
    wrongCode: "Koden passede ikke.",
    needName: "Skriv hendes navn.",
    shortCode: "Koden skal have mindst 6 tegn.",
    tripped: "Pip snublede. Prøv igen.",
  },
  en: {
    math: "Math",
    language: "Language",
    letters: "Letters",
    words: "Words",
    stories: "Stories",
    inARow: "in a row",
    stars: "stars",
    hello: "Hi",
    back: "Back",
    grownUp: "Grown-up",
    signOut: "Sign out",
    signOutHint: "The code is needed to open the game again.",
    firstTime: "First time",
    haveCode: "We have a code",
    herName: "Her name",
    familyCode: "Family code",
    start: "Start",
    saveCode: "I saved the code",
    codeHelp: "Save the code. The same code opens her stars on another device.",
    keepGoing: "Keep going",
    placeholder: "This game is on its way.",
    preview: "The database is not connected yet. Scores stay in this browser.",
    wrongCode: "That code did not match.",
    needName: "Write her name.",
    shortCode: "The code needs at least 6 characters.",
    tripped: "Pip tripped. Try again.",
  },
} as const;

export function t(language: LearningLanguage) {
  return copy[language];
}

export function cheer(language: LearningLanguage, streak: number) {
  if (language === "da") {
    return streak === 5 ? "Fem rigtige i træk!" : `${streak} rigtige i træk!`;
  }
  if (language === "sv") {
    return streak === 5 ? "Fem rätt i rad!" : `${streak} rätt i rad!`;
  }
  return streak === 5 ? "Five in a row!" : `${streak} in a row!`;
}

export function isLearningLanguage(value: string): value is LearningLanguage {
  return value === "da" || value === "sv" || value === "en";
}
