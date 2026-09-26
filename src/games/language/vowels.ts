import type { LearningLanguage } from "../types";
import type { WordCard } from "./content";

export type WordLevel = "easy" | "medium" | "hard";

const VOWELS: Record<LearningLanguage, string> = {
  da: "aeiouæøå",
  sv: "aeiouåäö",
  en: "aeiou",
};

export function vowelCount(word: string, language: LearningLanguage) {
  const vowels = VOWELS[language];
  let count = 0;
  for (const char of word.toLowerCase()) {
    if (vowels.includes(char)) count += 1;
  }
  return count;
}

export function levelForCount(count: number): WordLevel | null {
  if (count === 1 || count === 2) return "easy";
  if (count === 3) return "medium";
  if (count === 4) return "hard";
  return null;
}

export function wordsForLevel(
  words: readonly WordCard[],
  language: LearningLanguage,
  level: WordLevel,
) {
  return words.filter(
    (card) => levelForCount(vowelCount(card.word, language)) === level,
  );
}
