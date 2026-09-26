'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameProps } from '../types';
import { gameCss, icons, languageContent, uiCopy } from './content';
import { checkSpokenWord, playSpeech, recordUtterance } from './speech';

type Phase = 'read' | 'listening' | 'yes' | 'retry' | 'skip' | 'shown';

const STORY_MS = 7000;

function Icon({ svg }: { svg: string }) {
  return <span className="pip-icon" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Picture({ svg, label }: { svg: string; label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      style={{ width: '100%', height: '100%' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default function StoryGame({ language, onResult }: GameProps) {
  const copy = uiCopy[language];
  const stories = languageContent[language].stories;
  const [index, setIndex] = useState(0);
  const [seenLanguage, setSeenLanguage] = useState(language);
  const [phase, setPhase] = useState<Phase>('read');
  const mounted = useRef(true);
  const finished = useRef(false);

  if (seenLanguage !== language) {
    setSeenLanguage(language);
    setIndex(0);
    setPhase('read');
  }

  useEffect(() => {
    finished.current = false;
  }, [language]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const story = stories[index % stories.length];
  const script = story.sentences.join(' ');

  function hear() {
    void playSpeech(script, language).catch(() => undefined);
  }

  async function readAloud() {
    if (phase === 'listening' || phase === 'yes' || phase === 'shown' || phase === 'skip') return;
    setPhase('listening');
    try {
      const audio = await recordUtterance(STORY_MS);
      const correct = await checkSpokenWord(audio, script, language);
      if (!mounted.current) return;
      if (correct) {
        setPhase('yes');
        onResult({ correct: true, promptId: story.id });
        return;
      }
      setPhase('retry');
      onResult({ correct: false, promptId: story.id });
    } catch {
      if (!mounted.current) return;
      setPhase('skip');
    }
  }

  function markRead() {
    if (phase !== 'skip' || finished.current) return;
    finished.current = true;
    setPhase('shown');
    onResult({ correct: false, promptId: story.id });
  }

  function next() {
    finished.current = false;
    setPhase('read');
    setIndex((value) => value + 1);
  }

  const title =
    phase === 'yes'
      ? copy.niceReading
      : phase === 'retry'
        ? copy.tryAgain
        : phase === 'listening'
          ? copy.listening
          : phase === 'shown'
            ? copy.storyTitle
            : copy.readAloud;

  return (
    <section className="pip-game" lang={language} aria-label={copy.storyTitle}>
      <style>{gameCss}</style>
      <p className="pip-kicker">{copy.storyTitle}</p>
      {phase === 'yes' ? <p className="pip-stars" aria-hidden="true">★ ★ ★</p> : null}
      <h1 className="pip-title">{title}</h1>
      <div className="pip-stage is-wide">
        <Picture svg={story.picture} label={copy.storyTitle} />
      </div>
      {story.sentences.map((sentence, sentenceIndex) => (
        <p key={`${story.id}-${sentenceIndex}`} className="pip-story">
          {sentence}
        </p>
      ))}
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
          <button type="button" className="pip-action" onClick={markRead}>
            {copy.iReadIt}
          </button>
        ) : (
          <button
            type="button"
            className={phase === 'listening' ? 'pip-action pip-listening' : 'pip-action'}
            onClick={() => {
              void readAloud();
            }}
            disabled={phase === 'listening' || phase === 'yes' || phase === 'shown'}
          >
            <Icon svg={icons.mic} />
            {phase === 'listening' ? copy.listening : copy.readAloud}
          </button>
        )}
      </div>
      {phase === 'yes' || phase === 'shown' || phase === 'retry' ? (
        <button type="button" className="pip-next" onClick={next}>
          {copy.next}
        </button>
      ) : null}
    </section>
  );
}
