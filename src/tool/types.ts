export interface ReadabilityState {
  /** The user's text. */
  text: string;
  /** Words per minute for the reading-time estimate (default 220). */
  wpm: number;
  /** Sentences longer than this many words are flagged (default 25). */
  longSentenceThreshold: number;
  /** Sentences below this Flesch Reading Ease are flagged as hard (default 60). */
  hardSentenceFlesch: number;
}

export type SentenceFlagReason = 'long' | 'hard' | 'long+hard';

export interface SentenceInfo {
  index: number;
  text: string;
  wordCount: number;
  syllableCount: number;
  fleschEase: number;
  flagged: boolean;
  reason: SentenceFlagReason | null;
  /** Suggested rewrite hint for flagged sentences. */
  suggestion: string;
}

export interface ParagraphInfo {
  index: number;
  text: string;
  wordCount: number;
  sentenceCount: number;
  charCount: number;
}

export interface ReadabilityScores {
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  gunningFog: number;
  smog: number;
}

export interface TextCounts {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  sentences: number;
  paragraphs: number;
  syllables: number;
}

export interface DifficultyDistribution {
  veryEasy: number;
  easy: number;
  standard: number;
  difficult: number;
  veryDifficult: number;
}

export interface ComplexWord {
  word: string;
  syllables: number;
  length: number;
}

export interface AnalysisResult {
  counts: TextCounts;
  paragraphs: ParagraphInfo[];
  sentences: SentenceInfo[];
  scores: ReadabilityScores;
  distribution: DifficultyDistribution;
  complexWords: ComplexWord[];
  /** Reading time in minutes for the configured WPM (0 when no text). */
  readingTimeMinutes: number;
  /** Human-friendly reading time, e.g. "2m 30s" or "45s". */
  readingTimeLabel: string;
  flaggedCount: number;
}

export interface AnalysisReport {
  title: string;
  generatedAt: string;
  wpm: number;
  counts: TextCounts;
  readingTimeMinutes: number;
  readingTimeLabel: string;
  scores: ReadabilityScores;
  distribution: DifficultyDistribution;
  flaggedCount: number;
  flaggedSentences: {
    index: number;
    text: string;
    reason: SentenceFlagReason;
    suggestion: string;
  }[];
  complexWords: ComplexWord[];
}
