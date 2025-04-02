/*
 * languages.ts
 * Constants for programming languages
 */

import type { Language } from '../types/sidebar';

/**
 * Programming language options for repository filtering
 */
export const languages: Language[] = [
  { id: 'javascript', name: 'JavaScript', color: '#f1e05a' },
  { id: 'typescript', name: 'TypeScript', color: '#2b7489' },
  { id: 'python', name: 'Python', color: '#3572A5' },
  { id: 'java', name: 'Java', color: '#b07219' },
  { id: 'go', name: 'Go', color: '#00ADD8' },
  { id: 'rust', name: 'Rust', color: '#dea584' },
  { id: 'solidity', name: 'Solidity', color: '#AA6746' },
];

/**
 * Available programming languages for filtering
 */
export const LANGUAGES: Language[] = [
  {
    id: 'javascript',
    name: 'JavaScript',
    color: '#f1e05a',
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    color: '#2b7489',
  },
  {
    id: 'python',
    name: 'Python',
    color: '#3572A5',
  },
  {
    id: 'rust',
    name: 'Rust',
    color: '#dea584',
  },
  {
    id: 'solidity',
    name: 'Solidity',
    color: '#AA6746',
  },
  {
    id: 'move',
    name: 'Move',
    color: '#4F4F4F',
  },
  {
    id: 'unity',
    name: 'Unity',
    color: '#222C37',
  },
  {
    id: 'go',
    name: 'Go',
    color: '#00ADD8',
  },
] as const;
