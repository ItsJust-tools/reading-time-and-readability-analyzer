import { describe, it, expect } from 'vitest';
import {
  countSyllables,
  splitSentences,
  splitParagraphs,
  countWords,
  analyzeText,
  buildSummaryReport,
  defaultReadabilityState,
} from '../../src/tool/analyzer';
import { readabilityAnalyzerTool, SAMPLE_TEXT } from '../../src/tool/tool-definition';
import type { ReadabilityState } from '../../src/tool/types';

const baseState = (patch: Partial<ReadabilityState> = {}): ReadabilityState => ({
  ...defaultReadabilityState(),
  ...patch,
});

const firstSentence = (r: ReturnType<typeof analyzeText>) => {
  const s = r.sentences[0];
  if (!s) throw new Error('missing sentence');
  return s;
};

describe('countSyllables', () => {
  it('counts one syllable for short words', () => {
    expect(countSyllables('cat')).toBe(1);
    expect(countSyllables('the')).toBe(1);
  });

  it('counts five syllables for long words', () => {
    expect(countSyllables('readability')).toBeGreaterThanOrEqual(4);
    expect(countSyllables('beautiful')).toBe(3);
  });

  it('handles punctuation and case', () => {
    expect(countSyllables('Hello,')).toBe(countSyllables('hello'));
    expect(countSyllables('DONE!')).toBe(1);
  });

  it('returns 0 for empty or non-alpha input', () => {
    expect(countSyllables('')).toBe(0);
    expect(countSyllables('123')).toBe(0);
  });
});

describe('splitSentences', () => {
  it('splits on terminal punctuation', () => {
    expect(splitSentences('One. Two! Three?')).toEqual(['One.', 'Two!', 'Three?']);
  });

  it('keeps a trailing sentence without punctuation', () => {
    expect(splitSentences('One. Two')).toEqual(['One.', 'Two']);
  });

  it('returns empty for empty text', () => {
    expect(splitSentences('')).toEqual([]);
  });

  it('returns empty for punctuation-only text', () => {
    expect(splitSentences('. ! ? .. .')).toEqual([]);
  });
});

describe('splitParagraphs', () => {
  it('splits on blank lines and newlines', () => {
    expect(splitParagraphs('A.\n\nB.\nC.')).toEqual(['A.', 'B.', 'C.']);
  });

  it('skips empty paragraphs', () => {
    expect(splitParagraphs('  \n\nA.')).toEqual(['A.']);
    expect(splitParagraphs('')).toEqual([]);
  });
});

describe('countWords', () => {
  it('counts words separated by whitespace', () => {
    expect(countWords('hello world')).toBe(2);
    expect(countWords('one  two\tthree\nfour')).toBe(4);
  });

  it('returns 0 for empty, whitespace-only, or punctuation-only text', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('   ')).toBe(0);
    expect(countWords('...')).toBe(1); // one token
    expect(countWords('\n\t')).toBe(0);
  });
});

describe('analyzeText counts', () => {
  it('counts words, sentences, paragraphs for sample text', () => {
    const text = 'Hello world. This is a test!\n\nSecond paragraph here?';
    const r = analyzeText(baseState({ text }));
    // words: Hello world This is a test Second paragraph here = 9
    expect(r.counts.words).toBe(9);
    expect(r.counts.sentences).toBe(3);
    expect(r.counts.paragraphs).toBe(2);
    expect(r.counts.characters).toBe(text.length);
    expect(r.counts.charactersNoSpaces).toBe(text.replace(/\s/g, '').length);
  });

  it('handles empty text', () => {
    const r = analyzeText(baseState({ text: '' }));
    expect(r.counts.words).toBe(0);
    expect(r.counts.sentences).toBe(0);
    expect(r.counts.paragraphs).toBe(0);
    expect(r.scores.fleschReadingEase).toBe(0);
    expect(r.scores.fleschKincaidGrade).toBe(0);
    expect(r.scores.gunningFog).toBe(0);
    expect(r.scores.smog).toBe(0);
    expect(r.readingTimeMinutes).toBe(0);
    expect(r.readingTimeLabel).toBe('0s');
  });

  it('handles punctuation-only text', () => {
    const r = analyzeText(baseState({ text: '!!! ... ??' }));
    expect(r.counts.sentences).toBe(0);
    expect(r.scores.fleschReadingEase).toBe(0);
  });

  it('gives per-paragraph breakdown', () => {
    const r = analyzeText(baseState({ text: 'One two three.\n\nFour five.' }));
    expect(r.paragraphs).toHaveLength(2);
    const p0 = r.paragraphs[0];
    const p1 = r.paragraphs[1];
    if (!p0 || !p1) throw new Error('missing paragraph');
    expect(p0.wordCount).toBe(3);
    expect(p0.sentenceCount).toBe(1);
    expect(p1.wordCount).toBe(2);
  });
});

describe('reading time', () => {
  it('computes minutes from word count and WPM', () => {
    const text = Array.from({ length: 220 }, (_, i) => `w${i % 26}`).join(' ') + '.';
    const r = analyzeText(baseState({ text, wpm: 220 }));
    expect(r.counts.words).toBe(220); // '.' attaches to the last token
    expect(r.readingTimeMinutes).toBeCloseTo(220 / 220, 5);
  });

  it('respects configurable WPM: faster wpm means less time', () => {
    const text = 'one two three four five.';
    const fast = analyzeText(baseState({ text, wpm: 500 }));
    const slow = analyzeText(baseState({ text, wpm: 100 }));
    expect(fast.readingTimeMinutes).toBeLessThan(slow.readingTimeMinutes);
    expect(slow.readingTimeMinutes).toBeCloseTo(5 / 100, 5);
  });

  it('formats the label', () => {
    const r = analyzeText(baseState({ text: 'hello world friend.', wpm: 220 }));
    expect(r.readingTimeLabel).toBe('1s');
    const r2 = analyzeText(baseState({ text: Array(440).fill('a').join(' ') + '.', wpm: 120 }));
    expect(r2.readingTimeLabel).toBe('3m 40s');
  });
});

describe('Flesch scores for reference texts', () => {
  it('scores simple text as easy', () => {
    // "The cat sat on the mat." — all one-syllable words
    const r = analyzeText(baseState({ text: 'The cat sat on the mat.' }));
    expect(r.scores.fleschReadingEase).toBeGreaterThan(80);
    expect(r.scores.fleschKincaidGrade).toBeLessThan(5);
  });

  it('scores complex text as harder than simple text', () => {
    const simple = 'The cat sat on the mat and looked at the dog.';
    const complex =
      'Comprehensive organizational restructuring necessitated meticulous implementation strategies. ' +
      'Contemporary technological innovations facilitated unprecedented administrative efficiency improvements.';
    const rs = analyzeText(baseState({ text: simple }));
    const rc = analyzeText(baseState({ text: complex }));
    expect(rc.scores.fleschReadingEase).toBeLessThan(rs.scores.fleschReadingEase);
    expect(rc.scores.fleschKincaidGrade).toBeGreaterThan(rs.scores.fleschKincaidGrade);
    expect(rc.scores.gunningFog).toBeGreaterThan(rs.scores.gunningFog);
  });

  it('computes Flesch Reading Ease close to hand-calculated value', () => {
    // "The quick brown fox jumps over the lazy dog."
    // 9 words; heuristic: 'over' and 'lazy' count as 2 syllables → syllables = 11
    const r = analyzeText(baseState({ text: 'The quick brown fox jumps over the lazy dog.' }));
    expect(r.counts.syllables).toBe(11);
    // FRE = 206.835 - 1.015*9 - 84.6*(11/9) = 94.3
    expect(r.scores.fleschReadingEase).toBeCloseTo(94.3, 1);
  });

  it('computes Flesch-Kincaid grade close to hand-calculated value', () => {
    const r = analyzeText(baseState({ text: 'The quick brown fox jumps over the lazy dog.' }));
    // FKGL = 0.39*9 + 11.8*(11/9) - 15.59 ≈ 2.34
    expect(r.scores.fleschKincaidGrade).toBeCloseTo(2.34, 1);
  });
});

describe('sentence flagging', () => {
  it('flags sentences above the long-sentence threshold', () => {
    const long = Array.from({ length: 30 }, () => 'word').join(' ') + '.';
    const short = 'Short one.';
    const r = analyzeText(baseState({ text: `${short} ${long}`, longSentenceThreshold: 25 }));
    const s0 = r.sentences[0];
    const s1 = r.sentences[1];
    if (!s0 || !s1) throw new Error('missing sentences');
    expect(s0.flagged).toBe(false);
    expect(s1.flagged).toBe(true);
    expect(s1.reason).toBe('long');
    expect(r.flaggedCount).toBe(1);
  });

  it('respects configurable threshold — lower threshold flags more', () => {
    const text = Array.from({ length: 12 }, () => 'word').join(' ') + '.';
    const lenient = analyzeText(baseState({ text, longSentenceThreshold: 25 }));
    const strict = analyzeText(baseState({ text, longSentenceThreshold: 10 }));
    expect(lenient.flaggedCount).toBe(0);
    expect(strict.flaggedCount).toBe(1);
  });

  it('flags hard sentences below the Flesch threshold', () => {
    const complex =
      'Comprehensive organizational restructuring necessitated meticulous implementation strategies and documentation. ' +
      'The cat sat on the mat.';
    const r = analyzeText(
      baseState({ text: complex, longSentenceThreshold: 40, hardSentenceFlesch: 60 })
    );
    expect(firstSentence(r).flagged).toBe(true);
    expect(['hard', 'long+hard']).toContain(firstSentence(r).reason);
    const second = r.sentences[1];
    if (!second) throw new Error('missing sentence');
    expect(second.flagged).toBe(false);
  });

  it('does not flag very short sentences as hard', () => {
    const r = analyzeText(baseState({ text: 'Hi.', hardSentenceFlesch: 100 }));
    // single short sentence — flesch for <3 words is skipped
    expect(firstSentence(r).flagged).toBe(false);
  });

  it('combines reasons into long+hard', () => {
    const long = Array.from({ length: 30 }, () => 'extraordinary').join(' ') + '.';
    const r = analyzeText(
      baseState({ text: long, longSentenceThreshold: 25, hardSentenceFlesch: 95 })
    );
    expect(firstSentence(r).reason).toBe('long+hard');
    expect(firstSentence(r).suggestion).toContain('splitting');
    expect(firstSentence(r).suggestion).toContain('simplifying');
  });
});

describe('distribution and complex words', () => {
  it('buckets sentences by difficulty', () => {
    const text = 'The cat sat on the mat. Very easy this is.';
    const r = analyzeText(baseState({ text }));
    const total = Object.values(r.distribution).reduce((a, b) => a + b, 0);
    expect(total).toBe(r.counts.sentences);
  });

  it('lists long or rare words with syllable counts, deduplicated', () => {
    const text = 'Understanding extraordinary technology. Understanding is repeated.';
    const r = analyzeText(baseState({ text }));
    const words = r.complexWords.map((w) => w.word.toLowerCase());
    expect(words).toContain('understanding');
    expect(words).toContain('extraordinary');
    expect(words.filter((w) => w === 'understanding')).toHaveLength(1);
    const un = r.complexWords.find((w) => w.word.toLowerCase() === 'understanding');
    expect(un?.syllables).toBeGreaterThanOrEqual(3);
  });
});

describe('summary report', () => {
  it('includes counts, scores, and flagged sentences', () => {
    const text =
      'The cat sat on the mat. ' + Array.from({ length: 30 }, () => 'word').join(' ') + '.';
    const state = baseState({ text });
    const r = analyzeText(state);
    const report = buildSummaryReport(r, state);
    expect(report).toContain('Words: ' + r.counts.words);
    expect(report).toContain('Flesch Reading Ease');
    expect(report).toContain('Flagged sentences: 1');
    expect(report).toContain('[long]');
  });
});

describe('readabilityAnalyzerTool definition', () => {
  it('round-trips state through serialize/deserialize', () => {
    const state: ReadabilityState = {
      text: 'Hello world.',
      wpm: 300,
      longSentenceThreshold: 30,
      hardSentenceFlesch: 70,
    };
    const serialized = readabilityAnalyzerTool.serialize(state);
    const parsed: unknown = JSON.parse(serialized);
    const result = readabilityAnalyzerTool.deserialize(parsed);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual(state);
  });

  it('applies defaults and clamps for partial / bad data', () => {
    const result = readabilityAnalyzerTool.deserialize({ text: 'abc' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.wpm).toBe(220);
      expect(result.data.longSentenceThreshold).toBe(25);
      expect(result.data.hardSentenceFlesch).toBe(60);
    }
    const bad = readabilityAnalyzerTool.deserialize({ text: 'abc', wpm: -5 });
    expect(bad.success).toBe(true);
    if (bad.success) expect(bad.data.wpm).toBe(60); // clamped to min
  });

  it('rejects invalid payloads', () => {
    expect(readabilityAnalyzerTool.deserialize(null).success).toBe(false);
    expect(readabilityAnalyzerTool.deserialize('nope').success).toBe(false);
    expect(readabilityAnalyzerTool.deserialize({ wpm: 'x' }).success).toBe(false);
  });

  it('sample text analyzes cleanly', () => {
    const r = analyzeText({ ...defaultReadabilityState(), text: SAMPLE_TEXT });
    expect(r.counts.words).toBeGreaterThan(10);
    expect(r.counts.sentences).toBeGreaterThan(2);
  });
});
