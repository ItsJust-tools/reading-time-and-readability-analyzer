import type { Tool, DeserializeResult } from '@itsjust/core';
import toolConfig from './tool.config';
import type { ReadabilityState } from './types';
import {
  DEFAULT_HARD_SENTENCE_FLESCH,
  DEFAULT_LONG_SENTENCE_THRESHOLD,
  DEFAULT_WPM,
  analyzeText,
  defaultReadabilityState,
} from './analyzer';

const SAMPLE_TEXT = `The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.

Readability metrics help writers understand how hard their text is to read. Short sentences with common words score as easier than long sentences packed with unusual vocabulary.`;

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function isReadabilityState(value: unknown): value is ReadabilityState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ReadabilityState>;
  return typeof v.text === 'string';
}

export const readabilityAnalyzerTool: Tool<ReadabilityState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: {
    ...defaultReadabilityState(),
    text: SAMPLE_TEXT,
  },
  serialize: (state) => JSON.stringify(state),
  deserialize: (data): DeserializeResult<ReadabilityState> => {
    try {
      if (isReadabilityState(data)) {
        return {
          success: true,
          data: {
            text: data.text,
            wpm: clampNumber(data.wpm, DEFAULT_WPM, 60, 1000),
            longSentenceThreshold: clampNumber(
              data.longSentenceThreshold,
              DEFAULT_LONG_SENTENCE_THRESHOLD,
              5,
              100
            ),
            hardSentenceFlesch: clampNumber(
              data.hardSentenceFlesch,
              DEFAULT_HARD_SENTENCE_FLESCH,
              0,
              100
            ),
          },
        };
      }
      return { success: false, error: 'Invalid data format: expected readability analyzer state' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Deserialization error';
      return { success: false, error: `Failed to deserialize state: ${message}` };
    }
  },
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};

export { SAMPLE_TEXT, defaultReadabilityState, analyzeText };
