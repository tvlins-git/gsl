'use client';

import { useEffect, useMemo, useState } from 'react';
import type { GameProps } from '../types';
import { gameCss, icons, languageContent, uiCopy, type LetterCard } from './content';
import { playSpeech } from './speech';

type LetterRound = {
  target: LetterCard;
  choices: LetterCard[];
};

function buildLetterRound(letters: readonly LetterCard[], round: number): LetterRound {
  const total = letters.length;
  const target = letters[((round % total) + total) % total];
  const choices: LetterCard[] = [target];
  let step = 1;
  while (choices.length < Math.min(3, total)) {
    const candidate = letters[(round + step) % total];
    if (!choices.some((item) => item.id === candidate.id)) {
      choices.push(candidate);
    }
    step += 1;
  }
  const shift = round % choices.length;
  return {
    target,
    choices: [...choices.slice(shift), ...choices.slice(0, shift)],
  };
}

function Icon({ svg }: { svg: string }) {
  return <span className="pip-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default function AlphabetGame({ language, onResult }: GameProps) {
  const copy = uiCopy[language];
  const [round, setRound] = useState(0);
  const [seenLanguage, setSeenLanguage] = useState(language);
  const [picked, setPicked] = useState<LetterCard | null>(null);

  if (seenLanguage !== language) {
    setSeenLanguage(language);
    setRound(0);
    setPicked(null);
  }

  const roundSet = useMemo(
    () => buildLetterRound(languageContent[language].letters, round),
    [language, round],
  );

  useEffect(() => {
    let active = true;
    void playSpeech(roundSet.target.spoken, language).catch(() => {
      if (!active) return;
    });
    return () => {
      active = false;
    };
  }, [language, round, roundSet.target.spoken]);

  function replay() {
    void playSpeech(roundSet.target.spoken, language).catch(() => undefined);
  }

  function choose(letter: LetterCard) {
    if (picked) return;
    setPicked(letter);
    void playSpeech(letter.spoken, language).catch(() => undefined);
    onResult({
      correct: letter.id === roundSet.target.id,
      promptId: roundSet.target.id,
    });
  }

  function next() {
    setPicked(null);
    setRound((value) => value + 1);
  }

  const correct = picked?.id === roundSet.target.id;

  return (
    <section className="pip-game" lang={language} aria-label={copy.alphabetTitle}>
      <style>{gameCss}</style>
      <p className="pip-kicker">{copy.alphabetTitle}</p>
      {picked && correct ? <p className="pip-stars" aria-hidden="true">★ ★ ★</p> : null}
      <h1 className="pip-title">
        {picked == null ? (
          copy.whichSound
        ) : correct ? (
          copy.great
        ) : (
          <>
            {copy.thatWas}
            <span className="pip-glyph">{roundSet.target.glyph}</span>
          </>
        )}
      </h1>
      <button type="button" className="pip-action is-listen" onClick={replay}>
        <Icon svg={icons.speaker} />
        {copy.listen}
      </button>
      <div className="pip-letters" role="group" aria-label={copy.whichSound}>
        {roundSet.choices.map((letter) => {
          const isTarget = picked != null && letter.id === roundSet.target.id;
          const isPick = picked?.id === letter.id && !isTarget;
          const className = isTarget ? 'pip-letter is-yes' : isPick ? 'pip-letter is-pick' : 'pip-letter';
          return (
            <button
              key={letter.id}
              type="button"
              className={className}
              onClick={() => choose(letter)}
              disabled={picked != null}
            >
              {letter.glyph}
            </button>
          );
        })}
      </div>
      {picked != null ? (
        <button type="button" className="pip-next" onClick={next}>
          {copy.next}
        </button>
      ) : null}
    </section>
  );
}
