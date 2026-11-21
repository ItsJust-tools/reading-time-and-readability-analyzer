'use client';

import Link from 'next/link';
import type { AnalysisResult } from '../types';

interface ToolToolbarProps {
  onCopySummary?: () => void;
  onExportJson?: () => void;
  analysis: AnalysisResult | null;
}

function downloadJson(analysis: AnalysisResult, wpm: number) {
  const report = {
    title: 'Reading Time & Readability Analysis',
    generatedAt: new Date().toISOString(),
    wpm,
    counts: analysis.counts,
    readingTimeMinutes: analysis.readingTimeMinutes,
    readingTimeLabel: analysis.readingTimeLabel,
    scores: analysis.scores,
    distribution: analysis.distribution,
    flaggedCount: analysis.flaggedCount,
    flaggedSentences: analysis.sentences
      .filter((s) => s.flagged && s.reason)
      .map((s) => ({ index: s.index, text: s.text, reason: s.reason, suggestion: s.suggestion })),
    complexWords: analysis.complexWords,
  };
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'readability-analysis.json';
  a.click();
  URL.revokeObjectURL(url);
}

export function ToolToolbar({ onCopySummary, onExportJson, analysis }: ToolToolbarProps) {
  return (
    <div className="readability-toolbar">
      <button
        type="button"
        className="toolbar-btn"
        onClick={onCopySummary}
        disabled={!analysis || analysis.counts.words === 0}
        aria-label="Copy summary report to clipboard"
      >
        Copy summary
      </button>
      <button
        type="button"
        className="toolbar-btn"
        onClick={onExportJson ? () => onExportJson() : undefined}
        disabled={!analysis || analysis.counts.words === 0}
        aria-label="Export analysis as JSON"
      >
        Export JSON
      </button>
      <Link href="/help" className="toolbar-btn toolbar-help-link" aria-label="Open help page">
        Help
      </Link>
    </div>
  );
}

export { downloadJson };
