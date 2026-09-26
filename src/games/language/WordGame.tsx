'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '../types';
import { gameCss, icons, languageContent, uiCopy } from './content';
import { checkSpokenWord, playSpeech, recordUtterance } from './speech';

type Phase = 'say' | 'listening' | 'yes' | 'retry' | 'skip' | 'shown';

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
  const words = languageContent[language].words;
  const [index, setIndex] = useState(0);
  const [seenLanguage, setSeenLanguage] = useState(language);
  const [phase, setPhase] = useState<Phase>('say');
  const mounted = useRef(true);
  const revealed = useRef(false);

  if (seenLanguage !== language) {
    setSeenLanguage(language);
    setIndex(0);
    setPhase('say');
  }

  useEffect(() => {
    revealed.current = false;
  }, [language]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const card = words[index % words.length];
  const pictureVisible = phase === 'yes' || phase === 'shown';

  function hear() {
    void playSpeech(card.word, language).catch(() => undefined);
  }

  async function sayWord() {
    if (phase === 'listening' || phase === 'yes' || phase === 'shown' || phase === 'skip') return;
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
      setPhase('skip');
    }
  }

  function reveal() {
    if (phase !== 'skip' || revealed.current) return;
    revealed.current = true;
    setPhase('shown');
    onResult({ correct: false, promptId: card.id });
  }

  function next() {
    revealed.current = false;
    setPhase('say');
    setIndex((value) => value + 1);
  }

  const title =
    phase === 'yes'
      ? copy.great
      : phase === 'retry'
        ? copy.tryAgain
        : phase === 'shown'
          ? copy.hereItIs
          : phase === 'listening'
            ? copy.listening
            : copy.sayTheWord;

  return (
    <section className="pip-game" lang={language} aria-label={copy.wordTitle}>
      <style>{gameCss}</style>
      <p className="pip-kicker">{copy.wordTitle}</p>
      {phase === 'yes' ? <p className="pip-stars" aria-hidden="true">★ ★ ★</p> : null}
      <h1 className="pip-title">{title}</h1>
      <p className="pip-word">{card.word}</p>
      <div className="pip-stage">
        {pictureVisible ? <Picture svg={card.picture} label={card.word} /> : <p className="pip-mystery">?</p>}
      </div>
      <div className="pip-actions">
        <button
          type="button"
          className="pip-action is-listen"
          onClick={hear}
          disabled={phase === 'listening'}
        >
          <Icon svg={icons.speaker} />
          {copy.hearIt}
        </button>
        {phase === 'skip' ? (
          <button type="button" className="pip-action" onClick={reveal}>
            {copy.showPicture}
          </button>
        ) : (
          <button
            type="button"
            className={phase === 'listening' ? 'pip-action pip-listening' : 'pip-action'}
            onClick={() => {
              void sayWord();
            }}
            disabled={phase === 'listening' || phase === 'yes' || phase === 'shown'}
          >
            <Icon svg={icons.mic} />
            {phase === 'listening' ? copy.listening : copy.sayTheWord}
          </button>
        )}
      </div>
      {phase === 'skip' ? <p className="pip-hint">{copy.canSeePicture}</p> : null}
      {phase === 'yes' || phase === 'shown' || phase === 'retry' ? (
        <button type="button" className="pip-next" onClick={next}>
          {copy.next}
        </button>
      ) : null}
    </section>
  );
}
