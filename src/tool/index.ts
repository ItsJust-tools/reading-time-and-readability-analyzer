export { default as toolConfig } from './tool.config';
export { templateBaseVersion } from './tool.config';
export { templateMetadata, getPublicSiteUrl } from './template-metadata';
export {
  readabilityAnalyzerTool,
  SAMPLE_TEXT,
  defaultReadabilityState,
  analyzeText,
} from './tool-definition';
export {
  analyzeText as analyze,
  buildSummaryReport,
  countSyllables,
  splitSentences,
  splitParagraphs,
  countWords,
  DEFAULT_WPM,
  DEFAULT_LONG_SENTENCE_THRESHOLD,
  DEFAULT_HARD_SENTENCE_FLESCH,
} from './analyzer';
export { ToolCanvas } from './components/tool-canvas';
export { ToolToolbar, downloadJson } from './components/tool-toolbar';
export { ToolSidebar } from './components/tool-sidebar';
export type {
  ReadabilityState,
  ReadabilityScores,
  AnalysisResult,
  AnalysisReport,
  SentenceInfo,
  ParagraphInfo,
  ComplexWord,
  DifficultyDistribution,
  TextCounts,
} from './types';
