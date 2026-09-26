import assert from "node:assert/strict";
import test from "node:test";
import { languageContent } from "../src/games/language/content.ts";
import { buildLetterRound, pickIndex } from "../src/games/language/letter-round.ts";
import {
  letterSpeechAttempts,
  pickVoiceId,
  ttsLanguageCodes,
} from "../src/lib/tts-language.ts";

function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

test("the next alphabet letter is random and does not repeat immediately", () => {
  const letters = languageContent.da.letters;
  const random = rng(7);
  let previous: number | null = null;
  let lastId = "";
  for (let step = 0; step < 80; step += 1) {
    const round = buildLetterRound(letters, previous, random);
    assert.equal(round.choices.length, 3);
    assert.equal(round.choices.some((choice) => choice.id === round.target.id), true);
    if (lastId) assert.notEqual(round.target.id, lastId);
    lastId = round.target.id;
    previous = letters.findIndex((letter) => letter.id === round.target.id);
  }
});

test("a zero roll still skips the previous letter", () => {
  assert.equal(pickIndex(29, 0, () => 0), 1);
  assert.equal(pickIndex(29, null, () => 0), 0);
});

test("letter names follow Danish, Swedish, or English", () => {
  const spoken = (language: "da" | "sv" | "en", glyph: string) =>
    languageContent[language].letters.find((letter) => letter.glyph === glyph)?.spoken;

  assert.equal(spoken("da", "b"), "be");
  assert.equal(spoken("sv", "b"), "be");
  assert.equal(spoken("en", "b"), "bee");
  assert.equal(spoken("da", "w"), "dobbelt-v");
  assert.equal(spoken("sv", "w"), "dubbel-v");
  assert.equal(spoken("en", "w"), "double you");
  assert.equal(spoken("da", "æ"), "æ");
  assert.equal(spoken("sv", "ö"), "ö");
  assert.notEqual(spoken("da", "h"), spoken("en", "h"));
});

test("letter speech asks for da-DK, sv-SE, or en, then one fallback", () => {
  assert.deepEqual(ttsLanguageCodes("da"), { primary: "da-DK", fallback: "da" });
  assert.deepEqual(ttsLanguageCodes("sv"), { primary: "sv-SE", fallback: "sv" });
  assert.deepEqual(ttsLanguageCodes("en"), { primary: "en", fallback: "auto" });

  assert.deepEqual(letterSpeechAttempts("be", "da", "ara"), [
    { text: "be", voice_id: "ara", language: "da-DK" },
    { text: "be", voice_id: "ara", language: "da" },
  ]);
  assert.equal(letterSpeechAttempts("be", "sv", "ara")[0].language, "sv-SE");
  assert.equal(letterSpeechAttempts("bee", "en", "ara")[1].language, "auto");
});

test("a listed voice is chosen for the letter language", () => {
  const voices = [
    { voice_id: "eve", language: "en" },
    { voice_id: "freja", language: "da-DK" },
    { voice_id: "astrid", name: "Astrid", language: "sv" },
  ];
  assert.equal(pickVoiceId(voices, "da"), "freja");
  assert.equal(pickVoiceId(voices, "sv"), "astrid");
  assert.equal(pickVoiceId(voices, "en"), "eve");
  assert.equal(
    pickVoiceId(
      [
        { voice_id: "carina", language: "en" },
        { voice_id: "ara", language: "en" },
      ],
      "da",
    ),
    "ara",
  );
});
