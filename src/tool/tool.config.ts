import type { ToolConfig } from '@itsjust/core';
import packageJson from '../../package.json';

export const templateBaseVersion = packageJson.version;

const toolConfig = {
  id: '1795219478',
  name: 'Reading Time & Readability Analyzer',
  description:
    'Analyze pasted text to compute reading time, Flesch-Kincaid grade level, and readability scores with suggested rewrites flagged per sentence.',

  version: '1.0.0',
  exportFormats: ['json', 'png', 'jpeg', 'webp', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#2563eb',
    accentHover: '#1d4ed8',
    accentSubtle: 'rgba(37, 99, 235, 0.08)',
    brand: 'Readability Analyzer',
    icon: '📖',
  },
  shortcuts: [
    {
      title: 'Reading Time & Readability Analyzer',
      shortcuts: [
        {
          keys: 'Ctrl+Shift+C',
          label: 'Copy summary report',
          description: 'copy the analysis summary to the clipboard',
        },
        {
          keys: 'Ctrl+Shift+E',
          label: 'Export JSON report',
          description: 'download the full analysis as a JSON file',
        },
        {
          keys: 'Ctrl+Shift+R',
          label: 'Reset text',
          description: 'clear the editor and restore the sample text',
        },
      ],
    },
  ],
} satisfies ToolConfig;

export default toolConfig;
