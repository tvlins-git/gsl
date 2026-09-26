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
    familyCode: "Kod",
    start: "Starta",
    codeHelp: "Skriv koden för att öppna Pip.",
    keepGoing: "Fortsätt",
    placeholder: "Spelet kommer snart.",
    preview:
      "Databasen är inte kopplad än. Poängen stannar i den här webbläsaren.",
    wrongCode: "Koden stämde inte.",
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
    familyCode: "Kode",
    start: "Start",
    codeHelp: "Skriv koden for at åbne Pip.",
    keepGoing: "Videre",
    placeholder: "Spillet er på vej.",
    preview:
      "Databasen er ikke forbundet endnu. Pointene bliver i denne browser.",
    wrongCode: "Koden passede ikke.",
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
    familyCode: "Code",
    start: "Start",
    codeHelp: "Enter the code to open Pip.",
    keepGoing: "Keep going",
    placeholder: "This game is on its way.",
    preview: "The database is not connected yet. Scores stay in this browser.",
    wrongCode: "That code did not match.",
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
