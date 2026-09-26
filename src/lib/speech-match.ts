const STOP_WORDS: Record<string, Set<string>> = {
  da: new Set([
    "en",
    "et",
    "den",
    "det",
    "og",
    "er",
    "har",
    "vil",
    "kan",
    "på",
    "i",
    "med",
    "til",
    "som",
    "de",
    "der",
    "vi",
    "her",
  ]),
  sv: new Set([
    "en",
    "ett",
    "den",
    "det",
    "och",
    "är",
    "har",
    "vill",
    "kan",
    "på",
    "i",
    "med",
    "till",
    "som",
    "de",
    "vi",
    "här",
  ]),
  en: new Set([
    "the",
    "a",
    "an",
    "is",
    "has",
    "can",
    "in",
    "on",
    "we",
    "it",
    "to",
    "of",
  ]),
};

export function normalizeSpeech(value: string) {
  return value
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshtein(left: string, right: string) {
  const a = Array.from(left);
  const b = Array.from(right);
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const current = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + cost);
      previous = current;
    }
  }

  return row[b.length];
}

function tokenMatches(token: string, target: string) {
  if (token === target) return true;
  return target.length >= 4 && levenshtein(token, target) <= 1;
}

export function speechMatches(
  transcript: string,
  expected: string,
  language: string,
) {
  const heard = normalizeSpeech(transcript);
  const want = normalizeSpeech(expected);
  if (!heard || !want) return false;
  if (heard === want || heard.includes(want)) return true;

  const heardTokens = heard.split(" ");
  const expectedTokens = want.split(" ");
  if (expectedTokens.length === 1) {
    return heardTokens.some((token) => tokenMatches(token, expectedTokens[0]));
  }

  const stops = STOP_WORDS[language] ?? STOP_WORDS.en;
  const content = expectedTokens.filter(
    (token) => token.length > 1 && !stops.has(token),
  );
  const needed = content.length > 0 ? content : expectedTokens;
  const hits = needed.filter((word) =>
    heardTokens.some((token) => tokenMatches(token, word)),
  ).length;

  return hits / needed.length >= 0.6;
}
