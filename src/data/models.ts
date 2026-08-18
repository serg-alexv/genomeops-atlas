import YAML from 'yaml'
import codexSparkRaw from '../../knowledge/models/codex-spark.yaml?raw'
import codexRaw from '../../knowledge/models/codex.yaml?raw'
import geminiRaw from '../../knowledge/models/gemini.yaml?raw'
import claudeRaw from '../../knowledge/models/claude.yaml?raw'
import localModelsRaw from '../../knowledge/models/local-models.yaml?raw'
import githubCopilotRaw from '../../knowledge/models/github-copilot.yaml?raw'
import type { ModelProfile } from '../types'

interface RawProfile {
  id: string
  tool: { name: string; provider: string }
  category: string[]
  role: string
  positioning: string
  strengths: string[]
  weaknesses: string[]
  best_used_for: string[]
  avoid: string[]
  workflow_position: { before: string[]; during: string[]; after: string[] }
  evidence: {
    source: string
    verified_on: string
    official_claims?: string[]
  }
}

const normalize = (raw: string): ModelProfile => {
  const parsed = YAML.parse(raw) as RawProfile
  return {
    id: parsed.id,
    name: parsed.tool.name,
    provider: parsed.tool.provider,
    role: parsed.role,
    positioning: parsed.positioning,
    category: parsed.category,
    strengths: parsed.strengths,
    weaknesses: parsed.weaknesses,
    bestUsedFor: parsed.best_used_for,
    avoid: parsed.avoid,
    before: parsed.workflow_position.before,
    during: parsed.workflow_position.during,
    after: parsed.workflow_position.after,
    source: parsed.evidence.source,
    verifiedOn: String(parsed.evidence.verified_on),
    officialClaims: parsed.evidence.official_claims,
  }
}

export const modelProfiles = [
  normalize(codexRaw),
  normalize(codexSparkRaw),
  normalize(geminiRaw),
  normalize(claudeRaw),
  normalize(localModelsRaw),
  normalize(githubCopilotRaw),
]
