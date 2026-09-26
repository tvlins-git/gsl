import assert from "node:assert/strict";
import test from "node:test";
import {
  codeMatches,
  gateToken,
  gateTokenValid,
} from "../src/lib/access-gate.ts";

const SENTINEL = "unit-test-sentinel";

test("a missing access code keeps the gate closed", () => {
  const previous = process.env.PIP_ACCESS_CODE;
  delete process.env.PIP_ACCESS_CODE;
  try {
    assert.equal(codeMatches(SENTINEL), false);
    assert.equal(codeMatches(""), false);
    assert.equal(gateToken(), null);
    assert.equal(gateTokenValid("anything"), false);
  } finally {
    if (previous === undefined) delete process.env.PIP_ACCESS_CODE;
    else process.env.PIP_ACCESS_CODE = previous;
  }
});

test("only the server value opens the gate", () => {
  const previous = process.env.PIP_ACCESS_CODE;
  process.env.PIP_ACCESS_CODE = SENTINEL;
  try {
    assert.equal(codeMatches(SENTINEL), true);
    assert.equal(codeMatches(`  ${SENTINEL}  `), true);
    assert.equal(codeMatches(SENTINEL.toUpperCase()), false);
    assert.equal(codeMatches("nope"), false);
    assert.equal(codeMatches(""), false);

    const token = gateToken();
    assert.ok(token);
    assert.equal(token?.includes(SENTINEL), false);
    assert.equal(gateTokenValid(token), true);
    assert.equal(gateTokenValid(SENTINEL), false);
  } finally {
    if (previous === undefined) delete process.env.PIP_ACCESS_CODE;
    else process.env.PIP_ACCESS_CODE = previous;
  }
});
