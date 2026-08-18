import type { DecisionEntry } from '../types'

export const MEMORY_KEY = 'genomeops-atlas:decisions:v1'

export const seedDecisions: DecisionEntry[] = [
  {
    id: 'seed-1',
    projectId: 'l-lactis-oxygen',
    kind: 'decision',
    title: 'Keep biological edges in demo state',
    detail: 'No relationship in the pilot is promoted from candidate to confirmed without a linked source or observation record.',
    source: 'Pilot evidence policy',
    createdAt: '2026-08-18T10:00:00.000Z',
    demo: true,
  },
  {
    id: 'seed-2',
    projectId: 'lab-rm-systems',
    kind: 'validation_priority',
    title: 'Resolve canonical assembly identity first',
    detail: 'Record accession, file hash, and annotation provenance before comparing candidate systems.',
    source: 'Project setup boundary',
    createdAt: '2026-08-18T10:05:00.000Z',
    demo: true,
  },
  {
    id: 'seed-3',
    projectId: 'genome-knowledge-base',
    kind: 'unknown',
    title: 'Public versus private corpus boundary',
    detail: 'Account artifacts have not been automatically imported; each source needs an explicit sharing decision.',
    source: 'Pilot import boundary',
    createdAt: '2026-08-18T10:10:00.000Z',
    demo: true,
  },
]

export const loadDecisions = (): DecisionEntry[] => {
  if (typeof window === 'undefined') return seedDecisions
  try {
    const saved = window.localStorage.getItem(MEMORY_KEY)
    if (!saved) return seedDecisions
    const parsed = JSON.parse(saved) as DecisionEntry[]
    return Array.isArray(parsed) ? parsed : seedDecisions
  } catch {
    return seedDecisions
  }
}

export const saveDecisions = (entries: DecisionEntry[]) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(MEMORY_KEY, JSON.stringify(entries))
  }
}
