import assert from "node:assert/strict";
import test from "node:test";
import {
  friendIdsForStars,
  friendUnlockedAt,
  mergeUnlockedFriends,
} from "../src/lib/friends.ts";

test("Pip is always unlocked at zero stars", () => {
  assert.deepEqual(friendIdsForStars(0), ["pip"]);
  assert.equal(friendUnlockedAt(0)?.id, "pip");
});

test("each star unlocks the next friend", () => {
  assert.deepEqual(friendIdsForStars(1), ["pip", "mochi"]);
  assert.equal(friendUnlockedAt(1)?.id, "mochi");
  assert.equal(friendUnlockedAt(2)?.id, "caramel");
  assert.equal(friendUnlockedAt(3)?.id, "peach");
  assert.equal(friendUnlockedAt(4)?.id, "custard");
  assert.equal(friendUnlockedAt(5), null);
});

test("mergeUnlockedFriends unions cookie and star progress", () => {
  assert.deepEqual(mergeUnlockedFriends(["mochi"], 0), ["pip", "mochi"]);
  assert.deepEqual(mergeUnlockedFriends(["not-real"], 2), [
    "pip",
    "mochi",
    "caramel",
  ]);
});
