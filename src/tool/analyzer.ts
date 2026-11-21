import type {
  AnalysisResult,
  ComplexWord,
  DifficultyDistribution,
  ReadabilityScores,
  ReadabilityState,
  SentenceFlagReason,
  SentenceInfo,
  TextCounts,
} from './types';

export const DEFAULT_WPM = 220;
export const DEFAULT_LONG_SENTENCE_THRESHOLD = 25;
export const DEFAULT_HARD_SENTENCE_FLESCH = 60;

export function defaultReadabilityState(): ReadabilityState {
  return {
    text: '',
    wpm: DEFAULT_WPM,
    longSentenceThreshold: DEFAULT_LONG_SENTENCE_THRESHOLD,
    hardSentenceFlesch: DEFAULT_HARD_SENTENCE_FLESCH,
  };
}

const VOWELS = /[aeiouy]+/g;

/** Estimate syllable count for a single word using a standard heuristic. */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z']/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  let s = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const matches = s.match(VOWELS);
  return Math.max(1, matches ? matches.length : 0);
}

/** Split text into sentences on ., !, ? followed by whitespace/end. */
export function splitSentences(text: string): string[] {
  const result: string[] = [];
  const re = /[^.!?]+[.!?]+["')\]]*|\S+$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const s = m[0].trim();
    if (s && /[a-z0-9]/i.test(s)) result.push(s);
  }
  return result;
}

/** Split text into non-empty paragraphs (blank-line or single-newline separated). */
export function splitParagraphs(text: string): string[] {
  return (text ?? '')
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

export function countWords(text: string): number {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function countSyllablesInSentence(sentence: string): number {
  return sentence
    .split(/\s+/)
    .filter(Boolean)
    .reduce((sum, w) => sum + countSyllables(w), 0);
}

function fleschEaseFor(words: number, sentences: number, syllables: number): number {
  if (words === 0 || sentences === 0) return 0;
  const score = 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words);
  return Math.max(0, Math.round(score * 10) / 10);
}

function sentenceReason(
  wordCount: number,
  flesch: number,
  state: Pick<ReadabilityState, 'longSentenceThreshold' | 'hardSentenceFlesch'>
): SentenceFlagReason | null {
  const long = wordCount > state.longSentenceThreshold;
  const hard = wordsEnoughForFlesch(wordCount) && flesch < state.hardSentenceFlesch;
  if (long && hard) return 'long+hard';
  if (long) return 'long';
  if (hard) return 'hard';
  return null;
}

const MIN_FLESCH_WORDS = 3;

function wordsEnoughForFlesch(wordCount: number): boolean {
  return wordCount >= MIN_FLESCH_WORDS;
}

function buildSuggestion(reason: SentenceFlagReason): string {
  if (reason === 'long')
    return 'Consider splitting this long sentence into two or more shorter ones.';
  if (reason === 'hard') return 'Consider simplifying the vocabulary in this sentence.';
  return 'Consider splitting this sentence and simplifying its vocabulary.';
}

function difficultyBucket(score: number): keyof DifficultyDistribution {
  if (score >= 90) return 'veryEasy';
  if (score >= 70) return 'easy';
  if (score >= 60) return 'standard';
  if (score >= 50) return 'difficult';
  return 'veryDifficult';
}

function formatReadingTime(minutes: number): string {
  if (minutes <= 0) return '0s';
  const totalSeconds = Math.round(minutes * 60);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

/** Analyze the full text and return scores, flags, and counts. */
export function analyzeText(state: ReadabilityState): AnalysisResult {
  const text = state.text ?? '';
  const paragraphsRaw = splitParagraphs(text);
  const sentences = splitSentences(text);

  const words = countWords(text);
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, '').length;

  let totalSyllables = 0;
  const sentenceInfos: SentenceInfo[] = sentences.map((s, i) => {
    const wc = countWords(s);
    const sc = countSyllablesInSentence(s);
    totalSyllables += sc;
    const flesch = fleschEaseFor(wc, 1, sc);
    const reason = sentenceReason(wc, flesch, state);
    return {
      index: i,
      text: s,
      wordCount: wc,
      syllableCount: sc,
      fleschEase: flesch,
      flagged: reason !== null,
      reason,
      suggestion: reason ? buildSuggestion(reason) : '',
    };
  });

  const paragraphInfos = paragraphsRaw.map((p, i) => {
    const ps = splitSentences(p);
    return {
      index: i,
      text: p,
      wordCount: countWords(p),
      sentenceCount: ps.length,
      charCount: p.length,
    };
  });

  const n = sentences.length;
  const avgWords = n > 0 ? words / n : 0;
  const avgSyllablesPerWord = words > 0 ? totalSyllables / words : 0;

  const flesch =
    n > 0 && words > 0
      ? Math.max(0, Math.round((206.835 - 1.015 * avgWords - 84.6 * avgSyllablesPerWord) * 10) / 10)
      : 0;
  const fkGrade =
    n > 0 && words > 0
      ? Math.round((0.39 * avgWords + 11.8 * avgSyllablesPerWord - 15.59) * 10) / 10
      : 0;
  const complexWordsTotal = countComplexWordsTotal(sentences);
  const fog =
    n > 0 && words > 0
      ? Math.round(0.4 * (avgWords + 100 * (complexWordsTotal / words)) * 10) / 10
      : 0;
  const smogPolysyllables = countPolysyllablesTotal(sentences);
  const smog =
    n > 0 ? Math.round((1.043 * Math.sqrt(smogPolysyllables * (30 / n)) + 3.1291) * 10) / 10 : 0;

  const scores: ReadabilityScores = {
    fleschReadingEase: flesch,
    fleschKincaidGrade: fkGrade,
    gunningFog: fog,
    smog,
  };

  const distribution: DifficultyDistribution = {
    veryEasy: 0,
    easy: 0,
    standard: 0,
    difficult: 0,
    veryDifficult: 0,
  };
  for (const s of sentenceInfos) {
    if (wordsEnoughForFlesch(s.wordCount) === false) {
      distribution.veryEasy += 1;
      continue;
    }
    distribution[difficultyBucket(s.fleschEase)] += 1;
  }

  const complexWords: ComplexWord[] = collectComplexWords(text);

  const readingTimeMinutes = state.wpm > 0 && words > 0 ? words / state.wpm : 0;

  return {
    counts: {
      words,
      characters,
      charactersNoSpaces,
      sentences: n,
      paragraphs: paragraphInfos.length,
      syllables: totalSyllables,
    },
    paragraphs: paragraphInfos,
    sentences: sentenceInfos,
    scores,
    distribution,
    complexWords,
    readingTimeMinutes,
    readingTimeLabel: formatReadingTime(readingTimeMinutes),
    flaggedCount: sentenceInfos.filter((s) => s.flagged).length,
  };
}

const COMPLEX_WORD_MIN_LENGTH = 9;
const COMPLEX_WORD_MIN_SYLLABLES = 3;
const SMOG_MIN_SYLLABLES = 3;

function isComplexWord(word: string): boolean {
  const syl = countSyllables(word);
  return word.length >= COMPLEX_WORD_MIN_LENGTH || syl >= COMPLEX_WORD_MIN_SYLLABLES;
}

function countComplexWordsTotal(sentences: string[]): number {
  let total = 0;
  for (const s of sentences) {
    for (const w of s.split(/\s+/).filter(Boolean)) {
      if (isComplexWord(w) && /[a-z]/i.test(w)) total += 1;
    }
  }
  return total;
}

function countPolysyllablesTotal(sentences: string[]): number {
  let total = 0;
  for (const s of sentences) {
    for (const w of s.split(/\s+/).filter(Boolean)) {
      if (/[a-z]/i.test(w) && countSyllables(w) >= SMOG_MIN_SYLLABLES) total += 1;
    }
  }
  return total;
}

function collectComplexWords(text: string): ComplexWord[] {
  const seen = new Map<string, ComplexWord>();
  for (const raw of text.split(/\s+/).filter(Boolean)) {
    const word = raw.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, '');
    if (!word || !/[a-z]/i.test(word)) continue;
    if (!isComplexWord(word)) continue;
    const key = word.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, { word, syllables: countSyllables(word), length: word.length });
    }
  }
  return [...seen.values()]
    .sort((a, b) => b.syllables - a.syllables || b.length - a.length)
    .slice(0, 50);
}

/** Build the plain-text summary report for clipboard copy. */
export function buildSummaryReport(result: AnalysisResult, state: ReadabilityState): string {
  const { counts, scores, distribution } = result;
  return [
    `Reading Time & Readability Analysis`,
    ``,
    `Counts`,
    `- Words: ${counts.words}`,
    `- Characters: ${counts.characters} (${counts.charactersNoSpaces} without spaces)`,
    `- Sentences: ${counts.sentences}`,
    `- Paragraphs: ${counts.paragraphs}`,
    `- Syllables: ${counts.syllables}`,
    ``,
    `Reading time (${state.wpm} wpm): ${result.readingTimeLabel}`,
    ``,
    `Scores`,
    `- Flesch Reading Ease: ${scores.fleschReadingEase}`,
    `- Flesch-Kincaid Grade Level: ${scores.fleschKincaidGrade}`,
    `- Gunning Fog Index: ${scores.gunningFog}`,
    `- SMOG Index: ${scores.smog}`,
    ``,
    `Sentence difficulty`,
    `- Very easy (90+): ${distribution.veryEasy}`,
    `- Easy (70-89): ${distribution.easy}`,
    `- Standard (60-69): ${distribution.standard}`,
    `- Difficult (50-59): ${distribution.difficult}`,
    `- Very difficult (<50): ${distribution.veryDifficult}`,
    ``,
    `Flagged sentences: ${result.flaggedCount}`,
    ...result.sentences
      .filter((s) => s.flagged)
      .map(
        (s) =>
          `- [${s.reason}] "${s.text.slice(0, 80)}${s.text.length > 80 ? '…' : ''}" — ${s.suggestion}`
      ),
    ``,
    `Complex words: ${result.complexWords.length}`,
    ...(result.complexWords.length
      ? [result.complexWords.map((w) => `${w.word} (${w.syllables})`).join(', ')]
      : []),
  ].join('\n');
}
