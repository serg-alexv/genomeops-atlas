import fastUiRaw from '../../knowledge/prompts/coding/fast-ui-iteration.md?raw'
import archaeologyRaw from '../../knowledge/prompts/coding/repository-archaeology.md?raw'
import scientificFrontendRaw from '../../knowledge/prompts/visualization/scientific-app-frontend.md?raw'
import genomeAnalysisRaw from '../../knowledge/prompts/biology/evidence-first-genome-analysis.md?raw'
import crossModelRaw from '../../knowledge/prompts/analysis/cross-model-review.md?raw'
import type { PromptRecipe } from '../types'

export const promptRecipes: PromptRecipe[] = [
  {
    id: 'fast-ui-iteration',
    title: 'Fast UI iteration',
    group: 'coding',
    description: 'A tightly scoped Codex-Spark implementation loop.',
    body: fastUiRaw,
  },
  {
    id: 'repository-archaeology',
    title: 'Repository archaeology',
    group: 'coding',
    description: 'Read-only mapping of a repository before edits.',
    body: archaeologyRaw,
  },
  {
    id: 'scientific-app-frontend',
    title: 'Scientific app frontend',
    group: 'visualization',
    description: 'Architecture → implementation → review → deployment.',
    body: scientificFrontendRaw,
  },
  {
    id: 'evidence-first-genome-analysis',
    title: 'Evidence-first genome analysis',
    group: 'biology',
    description: 'Separate observations, evidence, predictions, and unknowns.',
    body: genomeAnalysisRaw,
  },
  {
    id: 'cross-model-review',
    title: 'Cross-model review',
    group: 'analysis',
    description: 'Compare assumptions without voting claims into truth.',
    body: crossModelRaw,
  },
]
