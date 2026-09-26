import { describe, expect, it } from "@jest/globals";
import { makeAddition, makeChoices, makeProblem, makeSubtraction } from "./problems";

function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function expectSingleDigit(value: number) {
  expect(Number.isInteger(value)).toBe(true);
  expect(value).toBeGreaterThanOrEqual(0);
  expect(value).toBeLessThanOrEqual(9);
}

describe("makeAddition", () => {
  it("adds two single digits without a two-digit sum", () => {
    const random = rng(1);
    for (let index = 0; index < 400; index += 1) {
      const problem = makeAddition(random);
      expectSingleDigit(problem.left);
      expectSingleDigit(problem.right);
      expectSingleDigit(problem.answer);
      expect(problem.answer).toBe(problem.left + problem.right);
      expect(problem.operation).toBe("add");
      expect(problem.promptId).toBe(`add-${problem.left}-${problem.right}`);
    }
  });

  it("stays within single digits when random returns its upper bound", () => {
    const problem = makeAddition(() => 1);
    expect(problem.left).toBe(9);
    expect(problem.right).toBe(0);
    expect(problem.answer).toBe(9);
  });
});

describe("makeSubtraction", () => {
  it("subtracts single digits and never goes below zero", () => {
    const random = rng(2);
    for (let index = 0; index < 400; index += 1) {
      const problem = makeSubtraction(random);
      expectSingleDigit(problem.left);
      expectSingleDigit(problem.right);
      expectSingleDigit(problem.answer);
      expect(problem.left).toBeGreaterThanOrEqual(problem.right);
      expect(problem.answer).toBe(problem.left - problem.right);
      expect(problem.operation).toBe("sub");
      expect(problem.promptId).toBe(`sub-${problem.left}-${problem.right}`);
    }
  });

  it("stays at zero or above when random stays high", () => {
    const problem = makeSubtraction(() => 0.999999);
    expect(problem.left).toBeGreaterThanOrEqual(problem.right);
    expect(problem.answer).toBeGreaterThanOrEqual(0);
    expect(problem.answer).toBeLessThanOrEqual(9);
  });
});

describe("makeProblem", () => {
  it("mixes addition and subtraction", () => {
    const random = rng(7);
    const operations = new Set<string>();
    for (let index = 0; index < 40; index += 1) {
      const problem = makeProblem(random);
      operations.add(problem.operation);
      expectSingleDigit(problem.left);
      expectSingleDigit(problem.right);
      expectSingleDigit(problem.answer);
      if (problem.operation === "sub") {
        expect(problem.answer).toBeGreaterThanOrEqual(0);
        expect(problem.left).toBeGreaterThanOrEqual(problem.right);
      }
    }
    expect(operations.has("add")).toBe(true);
    expect(operations.has("sub")).toBe(true);
  });
});

describe("makeChoices", () => {
  it("offers a few single-digit choices that include the answer", () => {
    const random = rng(3);
    for (let answer = 0; answer <= 9; answer += 1) {
      const choices = makeChoices(answer, 3, random);
      expect(choices).toHaveLength(3);
      expect(new Set(choices).size).toBe(3);
      expect(choices).toContain(answer);
      choices.forEach(expectSingleDigit);
    }
  });

  it("does not always put the answer in the same place", () => {
    const random = rng(11);
    const positions = new Set<number>();
    for (let index = 0; index < 30; index += 1) {
      positions.add(makeChoices(4, 3, random).indexOf(4));
    }
    expect(positions.size).toBeGreaterThan(1);
  });
});
