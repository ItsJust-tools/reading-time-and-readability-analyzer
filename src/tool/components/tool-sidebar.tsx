'use client';

import type { AnalysisResult, ReadabilityState } from '../types';

interface ToolSidebarProps {
  analysis: AnalysisResult | null;
  settings: Pick<ReadabilityState, 'wpm' | 'longSentenceThreshold' | 'hardSentenceFlesch'>;
  onSettingChange?: (patch: Partial<ReadabilityState>) => void;
  fontSize?: number;
  onFontSizeChange?: (delta: number) => void;
}

const DISTRIBUTION_LABELS: {
  key: keyof NonNullable<ToolSidebarProps['analysis']>['distribution'];
  label: string;
}[] = [
  { key: 'veryEasy', label: 'Very easy (90+)' },
  { key: 'easy', label: 'Easy (70–89)' },
  { key: 'standard', label: 'Standard (60–69)' },
  { key: 'difficult', label: 'Difficult (50–59)' },
  { key: 'veryDifficult', label: 'Very difficult (<50)' },
];

function fmt(n: number): string {
  return n.toLocaleString();
}

export function ToolSidebar({
  analysis,
  settings,
  onSettingChange,
  fontSize,
  onFontSizeChange,
}: ToolSidebarProps) {
  const dist = analysis?.distribution;
  const maxBucket = dist ? Math.max(1, ...Object.values(dist)) : 1;

  return (
    <div className="readability-sidebar">
      {analysis && (
        <div className="sidebar-section">
          <h3>Counts</h3>
          <dl className="stats-list">
            <div className="stat-row">
              <dt>Words</dt>
              <dd>{fmt(analysis.counts.words)}</dd>
            </div>
            <div className="stat-row">
              <dt>Characters</dt>
              <dd>{fmt(analysis.counts.characters)}</dd>
            </div>
            <div className="stat-row">
              <dt>Without spaces</dt>
              <dd>{fmt(analysis.counts.charactersNoSpaces)}</dd>
            </div>
            <div className="stat-row">
              <dt>Sentences</dt>
              <dd>{fmt(analysis.counts.sentences)}</dd>
            </div>
            <div className="stat-row">
              <dt>Paragraphs</dt>
              <dd>{fmt(analysis.counts.paragraphs)}</dd>
            </div>
            <div className="stat-row">
              <dt>Syllables</dt>
              <dd>{fmt(analysis.counts.syllables)}</dd>
            </div>
          </dl>
        </div>
      )}

      {analysis && (
        <div className="sidebar-section">
          <h3>Reading time</h3>
          <div className="reading-time">
            <span className="reading-time-value" aria-live="polite">
              {analysis.readingTimeLabel}
            </span>
            <span className="reading-time-wpm">at {settings.wpm} wpm</span>
          </div>
          <label className="setting-row">
            <span>Words per minute: {settings.wpm}</span>
            <input
              type="range"
              min={60}
              max={500}
              step={10}
              value={settings.wpm}
              onChange={(e) => onSettingChange?.({ wpm: Number(e.target.value) })}
              aria-label="Words per minute"
            />
          </label>
        </div>
      )}

      {analysis && (
        <div className="sidebar-section">
          <h3>Readability scores</h3>
          <dl className="stats-list">
            <div className="stat-row">
              <dt>Flesch Reading Ease</dt>
              <dd>{analysis.scores.fleschReadingEase.toFixed(1)}</dd>
            </div>
            <div className="stat-row">
              <dt>Flesch-Kincaid Grade</dt>
              <dd>{analysis.scores.fleschKincaidGrade.toFixed(1)}</dd>
            </div>
            <div className="stat-row">
              <dt>Gunning Fog</dt>
              <dd>{analysis.scores.gunningFog.toFixed(1)}</dd>
            </div>
            <div className="stat-row">
              <dt>SMOG Index</dt>
              <dd>{analysis.scores.smog.toFixed(1)}</dd>
            </div>
          </dl>
        </div>
      )}

      {dist && (
        <div className="sidebar-section">
          <h3>Sentence difficulty</h3>
          <div
            className="distribution"
            role="img"
            aria-label="Difficulty distribution across sentences"
          >
            {DISTRIBUTION_LABELS.map(({ key, label }) => (
              <div key={key} className="dist-row">
                <span className="dist-label">{label}</span>
                <span className="dist-bar-track">
                  <span
                    className="dist-bar"
                    style={{ width: `${Math.round((dist[key] / maxBucket) * 100)}%` }}
                  />
                </span>
                <span className="dist-value">{dist[key]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis && (
        <div className="sidebar-section">
          <h3>Flagged sentences ({analysis.flaggedCount})</h3>
          <label className="setting-row">
            <span>Long sentence threshold: {settings.longSentenceThreshold} words</span>
            <input
              type="range"
              min={10}
              max={60}
              step={1}
              value={settings.longSentenceThreshold}
              onChange={(e) => onSettingChange?.({ longSentenceThreshold: Number(e.target.value) })}
              aria-label="Long sentence threshold in words"
            />
          </label>
          <label className="setting-row">
            <span>Hard sentence ease &lt; {settings.hardSentenceFlesch}</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={settings.hardSentenceFlesch}
              onChange={(e) => onSettingChange?.({ hardSentenceFlesch: Number(e.target.value) })}
              aria-label="Hard sentence Flesch threshold"
            />
          </label>
        </div>
      )}

      {analysis && (
        <div className="sidebar-section">
          <h3>Complex words ({analysis.complexWords.length})</h3>
          {analysis.complexWords.length === 0 ? (
            <p className="empty-hint">No long or rare words.</p>
          ) : (
            <ul className="vocab-list">
              {analysis.complexWords.map((w) => (
                <li key={w.word} className="vocab-item">
                  <span className="vocab-word">{w.word}</span>
                  <span className="vocab-meta">
                    {w.syllables} syl · {w.length} chars
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {analysis && analysis.paragraphs.length > 0 && (
        <div className="sidebar-section">
          <h3>Paragraph breakdown</h3>
          <dl className="stats-list">
            {analysis.paragraphs.map((p) => (
              <div key={p.index} className="stat-row">
                <dt>¶{p.index + 1}</dt>
                <dd>
                  {p.wordCount} words · {p.sentenceCount} sentences
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {fontSize !== undefined && onFontSizeChange && (
        <div className="sidebar-section">
          <h3>Font Size</h3>
          <div className="sidebar-font-controls">
            <button
              type="button"
              className="font-btn"
              onClick={() => onFontSizeChange(-2)}
              aria-label="Decrease font size"
            >
              A−
            </button>
            <span className="font-size-display" aria-live="polite">
              {fontSize}px
            </span>
            <button
              type="button"
              className="font-btn"
              onClick={() => onFontSizeChange(2)}
              aria-label="Increase font size"
            >
              A+
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
