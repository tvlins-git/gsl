'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '../types';
import { gameCss, icons, languageContent, uiCopy } from './content';
import { checkSpokenWord, recordUtterance } from './speech';
import { wordsForLevel, type WordLevel } from './vowels';

type Phase = 'say' | 'listening' | 'yes' | 'retry';

const LEVELS: readonly WordLevel[] = ['easy', 'medium', 'hard'];

const WORD_MS = 2800;

function Icon({ svg }: { svg: string }) {
  return <span className="pip-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Picture({ svg, label }: { svg: string; label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      style={{ width: '78%', height: '78%' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default function WordGame({ language, onResult }: GameProps) {
  const copy = uiCopy[language];
  const [level, setLevel] = useState<WordLevel>('easy');
  const words = wordsForLevel(languageContent[language].words, language, level);
  const [index, setIndex] = useState(0);
  const [seenLanguage, setSeenLanguage] = useState(language);
  const [phase, setPhase] = useState<Phase>('say');
  const mounted = useRef(true);

  if (seenLanguage !== language) {
    setSeenLanguage(language);
    setIndex(0);
    setPhase('say');
  }

  function chooseLevel(next: WordLevel) {
    if (next === level) return;
    setLevel(next);
    setIndex(0);
    setPhase('say');
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const card = words.length > 0 ? words[index % words.length] : null;
  const pictureVisible = phase === 'yes';

  async function sayWord() {
    if (!card || phase === 'listening' || phase === 'yes') return;
    setPhase('listening');
    try {
      const audio = await recordUtterance(WORD_MS);
      const correct = await checkSpokenWord(audio, card.word, language);
      if (!mounted.current) return;
      if (correct) {
        setPhase('yes');
        onResult({ correct: true, promptId: card.id });
        return;
      }
      setPhase('retry');
      onResult({ correct: false, promptId: card.id });
    } catch {
      if (!mounted.current) return;
      setPhase('retry');
    }
  }

  function next() {
    setPhase('say');
    setIndex((value) => value + 1);
  }

  const title =
    phase === 'yes' ? copy.great : phase === 'retry' ? copy.tryAgain : phase === 'listening' ? copy.listening : copy.sayTheWord;

  return (
    <section className="pip-game" lang={language} aria-label={copy.wordTitle}>
      <style>{gameCss}</style>
      <p className="pip-kicker">{copy.wordTitle}</p>
      <div className="pip-levels" role="group" aria-label={copy.wordTitle}>
        {LEVELS.map((item) => (
          <button
            key={item}
            type="button"
            className={item === level ? 'pip-level is-on' : 'pip-level'}
            aria-pressed={item === level}
            onClick={() => chooseLevel(item)}
          >
            {copy[item]}
          </button>
        ))}
      </div>
      {phase === 'yes' ? <p className="pip-stars" aria-hidden="true">★ ★ ★</p> : null}
      <h1 className="pip-title">{title}</h1>
      {card ? <p className="pip-word">{card.word}</p> : null}
      <div className="pip-stage">
        {card && pictureVisible ? (
          <Picture svg={card.picture} label={card.word} />
        ) : (
          <p className="pip-mystery">?</p>
        )}
      </div>
      {phase === 'yes' ? null : (
        <div className="pip-actions">
          <button
            type="button"
            className={phase === 'listening' ? 'pip-action pip-listening' : 'pip-action'}
            onClick={() => {
              void sayWord();
            }}
            disabled={!card || phase === 'listening'}
          >
            <Icon svg={icons.mic} />
            {phase === 'listening' ? copy.listening : copy.sayTheWord}
          </button>
        </div>
      )}
      {phase === 'yes' || phase === 'retry' ? (
        <button type="button" className="pip-next" onClick={next}>
          {copy.next}
        </button>
      ) : null}
    </section>
  );
}
