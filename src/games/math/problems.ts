export type MathOperation = "add" | "sub";

export type MathProblem = {
  promptId: string;
  operation: MathOperation;
  left: number;
  right: number;
  answer: number;
};

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

function roll(random: () => number, maxInclusive: number): number {
  const span = maxInclusive + 1;
  const value = Math.floor(random() * span);
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > maxInclusive) return maxInclusive;
  return value;
}

function shuffle(values: number[], random: () => number): number[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = roll(random, index);
    const current = copy[index];
    copy[index] = copy[swapIndex] ?? current;
    copy[swapIndex] = current;
  }
  return copy;
}

export function makeAddition(random: () => number = Math.random): MathProblem {
  const left = roll(random, 9);
  const right = roll(random, 9 - left);
  const answer = left + right;
  return {
    promptId: `add-${left}-${right}`,
    operation: "add",
    left,
    right,
    answer,
  };
}

export function makeSubtraction(random: () => number = Math.random): MathProblem {
  const left = roll(random, 9);
  const right = roll(random, left);
  const answer = left - right;
  return {
    promptId: `sub-${left}-${right}`,
    operation: "sub",
    left,
    right,
    answer,
  };
}

export function makeProblem(random: () => number = Math.random): MathProblem {
  return random() < 0.5 ? makeAddition(random) : makeSubtraction(random);
}

export function makeChoices(
  answer: number,
  count = 3,
  random: () => number = Math.random,
): number[] {
  const size = Math.min(DIGITS.length, Math.max(1, Math.floor(count)));
  const distractors = shuffle(
    DIGITS.filter((digit) => digit !== answer),
    random,
  );
  return shuffle([answer, ...distractors.slice(0, size - 1)], random);
}
