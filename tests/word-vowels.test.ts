import assert from "node:assert/strict";
import test from "node:test";
import { languageContent } from "../src/games/language/content.ts";
import {
  levelForCount,
  vowelCount,
  wordsForLevel,
  type WordLevel,
} from "../src/games/language/vowels.ts";
import type { LearningLanguage } from "../src/games/types.ts";

const languages: LearningLanguage[] = ["da", "sv", "en"];
const levels: WordLevel[] = ["easy", "medium", "hard"];

test("language vowels include the extra letters", () => {
  assert.equal(vowelCount("måne", "da"), 2);
  assert.equal(vowelCount("træ", "da"), 1);
  assert.equal(vowelCount("papegøje", "da"), 4);
  assert.equal(vowelCount("måne", "sv"), 2);
  assert.equal(vowelCount("träd", "sv"), 1);
  assert.equal(vowelCount("papegoja", "sv"), 4);
  assert.equal(vowelCount("bee", "en"), 2);
  assert.equal(vowelCount("rhythm", "en"), 0);
});

test("easy is 1 or 2 vowels, medium is 3, and hard is 4", () => {
  assert.equal(levelForCount(1), "easy");
  assert.equal(levelForCount(2), "easy");
  assert.equal(levelForCount(3), "medium");
  assert.equal(levelForCount(4), "hard");
  assert.equal(levelForCount(0), null);
  assert.equal(levelForCount(5), null);
});

test("each language has words on every level and hides the others", () => {
  for (const language of languages) {
    const words = languageContent[language].words;
    for (const level of levels) {
      const picked = wordsForLevel(words, language, level);
      assert.ok(picked.length > 0, `${language} ${level}`);
      for (const card of picked) {
        const count = vowelCount(card.word, language);
        assert.equal(levelForCount(count), level);
      }
    }
    const easy = new Set(wordsForLevel(words, language, "easy").map((card) => card.id));
    for (const card of wordsForLevel(words, language, "hard")) {
      assert.equal(easy.has(card.id), false);
    }
  }
});
