export function pickIndex(
  length: number,
  previous: number | null,
  random: () => number,
): number {
  if (length <= 1) return 0;
  const continuing = previous != null && previous >= 0 && previous < length;
  const span = continuing ? length - 1 : length;
  const roll = Math.min(span - 1, Math.max(0, Math.floor(random() * span)));
  if (!continuing || previous == null) return roll;
  return roll >= previous ? roll + 1 : roll;
}

export function buildLetterRound<T extends { id: string }>(
  letters: readonly T[],
  previousIndex: number | null,
  random: () => number,
): { target: T; choices: T[] } {
  const targetIndex = pickIndex(letters.length, previousIndex, random);
  const target = letters[targetIndex];
  const pool = letters.map((_, index) => index).filter((index) => index !== targetIndex);
  const distractors: T[] = [];
  while (distractors.length < Math.min(2, pool.length)) {
    const draw = Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)));
    distractors.push(letters[pool.splice(draw, 1)[0]]);
  }
  const choices = [target, ...distractors];
  for (let index = choices.length - 1; index > 0; index -= 1) {
    const swap = Math.min(index, Math.max(0, Math.floor(random() * (index + 1))));
    const current = choices[index];
    choices[index] = choices[swap];
    choices[swap] = current;
  }
  return { target, choices };
}
