'use client';

import { useMemo } from 'react';
import type { AnalysisResult } from '../types';

interface ToolCanvasProps {
  text: string;
  analysis: AnalysisResult;
  canvasRef?: React.RefObject<HTMLDivElement | null>;
  onChange?: (text: string) => void;
}

const FLAG_CLASS: Record<string, string> = {
  long: 'flag-long',
  hard: 'flag-hard',
  'long+hard': 'flag-both',
};

export function ToolCanvas({ text, analysis, canvasRef, onChange }: ToolCanvasProps) {
  const flagged = useMemo(() => {
    const map = new Map<number, { reason: string; suggestion: string }>();
    for (const s of analysis.sentences) {
      if (s.flagged && s.reason) map.set(s.index, { reason: s.reason, suggestion: s.suggestion });
    }
    return map;
  }, [analysis.sentences]);

  return (
    <div
      ref={canvasRef}
      className="readability-canvas"
      role="application"
      aria-label="Text editor and analysis"
    >
      <div className="editor-panel">
        <label htmlFor="readability-input" className="panel-label">
          Text to analyze
        </label>
        <textarea
          id="readability-input"
          className="readability-textarea"
          value={text}
          onChange={(e) => onChange?.(e.target.value)}
          aria-label="Text to analyze"
          spellCheck={false}
          placeholder="Paste or type text here..."
        />
      </div>

      <div className="sentences-panel">
        <h3 className="panel-label">Sentences ({analysis.sentences.length})</h3>
        {analysis.sentences.length === 0 ? (
          <p className="empty-hint">No sentences yet.</p>
        ) : (
          <ol className="sentence-list">
            {analysis.sentences.map((s) => {
              const info = s.flagged && s.reason ? flagged.get(s.index) : undefined;
              return (
                <li
                  key={s.index}
                  className={`sentence-item ${s.flagged ? `flagged ${FLAG_CLASS[s.reason ?? ''] ?? ''}` : ''}`}
                >
                  <span className="sentence-text">{s.text}</span>
                  <span className="sentence-meta">
                    {s.wordCount} words · ease {s.fleschEase.toFixed(1)}
                    {info ? ` · ${info.reason}` : ''}
                  </span>
                  {info ? <span className="sentence-suggestion">{info.suggestion}</span> : null}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
