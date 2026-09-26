/// <reference types="jest" />

import { languageContent, type StoryCard } from './content';
import type { LearningLanguage } from '../types';

const languages: LearningLanguage[] = ['da', 'sv', 'en'];
const SHORT_WORD_MAX = 4;

function glyphs(language: LearningLanguage): string[] {
  return languageContent[language].letters.map((letter) => letter.glyph);
}

function sentenceCount(story: StoryCard): number {
  return story.sentences
    .join(' ')
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0).length;
}

function expectInlineSvg(markup: string) {
  const withoutNamespace = markup.replaceAll('xmlns="http://www.w3.org/2000/svg"', '');
  expect(markup).toContain('<svg');
  expect(markup).not.toContain('<image');
  expect(withoutNamespace).not.toMatch(/https?:\/\//i);
  expect(markup).not.toMatch(/url\(/i);
}

describe('language game content', () => {
  it('has a letter set for Danish, Swedish, and English', () => {
    expect(glyphs('da')).toEqual([...'abcdefghijklmnopqrstuvwxyzæøå']);
    expect(glyphs('sv')).toEqual([...'abcdefghijklmnopqrstuvwxyzåäö']);
    expect(glyphs('en')).toEqual([...'abcdefghijklmnopqrstuvwxyz']);
  });

  it.each(languages)('gives %s letters she can tap', (language) => {
    const letters = languageContent[language].letters;
    expect(letters.length).toBeGreaterThan(0);
    const ids = letters.map((letter) => letter.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const letter of letters) {
      expect([...letter.glyph].length).toBe(1);
      expect(letter.spoken).toBe(letter.glyph);
    }
  });

  it.each(languages)('uses only short single words in %s', (language) => {
    const words = languageContent[language].words;
    expect(words.length).toBeGreaterThan(0);
    for (const card of words) {
      expect(card.word).toMatch(/^\S+$/);
      expect([...card.word].length).toBeGreaterThan(0);
      expect([...card.word].length).toBeLessThanOrEqual(SHORT_WORD_MAX);
      expect(card.word).not.toMatch(/[.!?,]/);
      expectInlineSvg(card.picture);
    }
  });

  it.each(languages)('tells %s stories in one or two sentences', (language) => {
    const stories = languageContent[language].stories;
    expect(stories.length).toBeGreaterThan(0);
    for (const story of stories) {
      expect(story.sentences.length).toBeGreaterThanOrEqual(1);
      expect(story.sentences.length).toBeLessThanOrEqual(2);
      expect(sentenceCount(story)).toBe(story.sentences.length);
      for (const sentence of story.sentences) {
        expect(sentence.trim().length).toBeGreaterThan(0);
        expect(sentence).toMatch(/[.!?]$/);
      }
      expectInlineSvg(story.picture);
    }
  });
});
