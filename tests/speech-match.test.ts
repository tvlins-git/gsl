import assert from "node:assert/strict";
import test from "node:test";
import { speechMatches } from "../src/lib/speech-match.ts";

test("a single word matches when she says it", () => {
  assert.equal(speechMatches("hund", "hund", "sv"), true);
  assert.equal(speechMatches("It is a dog", "dog", "en"), true);
});

test("a short word does not match a near miss", () => {
  assert.equal(speechMatches("kat", "ko", "da"), false);
});

test("a longer word allows one small mishearing", () => {
  assert.equal(speechMatches("hundt", "hund", "sv"), true);
});

test("a sentence matches when the main words are there", () => {
  assert.equal(
    speechMatches("the dog has a ball", "The dog has a ball.", "en"),
    true,
  );
  assert.equal(speechMatches("ball", "The dog has a ball.", "en"), false);
});

test("an empty recording is not correct", () => {
  assert.equal(speechMatches("", "hund", "sv"), false);
});
