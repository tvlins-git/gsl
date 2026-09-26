'use client';

import { useEffect, useState } from 'react';
import type { GameProps, LearningLanguage } from '../types';
import { gameCss, icons, languageContent, uiCopy, type LetterCard } from './content';
import { buildLetterRound } from './letter-round';
import { playSpeech } from './speech';

type LetterRound = {
  target: LetterCard;
  choices: LetterCard[];
};

function freshRound(language: LearningLanguage, previousIndex: number | null = null): LetterRound {
  return buildLetterRound(languageContent[language].letters, previousIndex, Math.random);
}

function Icon({ svg }: { svg: string }) {
  return <span className="pip-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}

export default function AlphabetGame({ language, onResult }: GameProps) {
  const copy = uiCopy[language];
  const [seenLanguage, setSeenLanguage] = useState(language);
  const [picked, setPicked] = useState<LetterCard | null>(null);
  const [roundSet, setRoundSet] = useState(() => freshRound(language));

  if (seenLanguage !== language) {
    setSeenLanguage(language);
    setPicked(null);
    setRoundSet(freshRound(language));
  }

  useEffect(() => {
    let active = true;
    void playSpeech(roundSet.target.spoken, language, { letter: true }).catch(() => {
      if (!active) return;
    });
    return () => {
      active = false;
    };
  }, [language, roundSet.target.id, roundSet.target.spoken]);

  function replay() {
    void playSpeech(roundSet.target.spoken, language, { letter: true }).catch(() => undefined);
  }

  function choose(letter: LetterCard) {
    if (picked) return;
    setPicked(letter);
    void playSpeech(letter.spoken, language, { letter: true }).catch(() => undefined);
    onResult({
      correct: letter.id === roundSet.target.id,
      promptId: roundSet.target.id,
    });
  }

  function next() {
    const letters = languageContent[language].letters;
    const previous = letters.findIndex((letter) => letter.id === roundSet.target.id);
    setPicked(null);
    setRoundSet(freshRound(language, previous < 0 ? null : previous));
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
