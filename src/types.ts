export type ViewId =
  | 'projects'
  | 'prompt'
  | 'evidence'
  | 'tools'
  | 'workforce'
  | 'memory'

export type EvidenceStatus =
  | 'confirmed'
  | 'predicted'
  | 'unknown'
  | 'needs_validation'

export interface EvidenceNode {
  id: string
  label: string
  kind: 'gene' | 'factor' | 'phenotype' | 'source' | 'question' | 'decision'
  status: EvidenceStatus
  x: number
  y: number
  summary: string
  evidence: string
  nextCheck: string
}

export interface EvidenceEdge {
  from: string
  to: string
  relation: string
}

export interface GenomeProject {
  id: string
  index: string
  title: string
  shortTitle: string
  organism: string
  summary: string
  question: string
  lastDecision: string
  unknowns: string[]
  nodes: EvidenceNode[]
  edges: EvidenceEdge[]
}

export interface ToolRecord {
  id: string
  name: string
  stage: ToolStage
  useFor: string
  why: string
  watchFor: string
  modes: Array<'browser' | 'desktop' | 'cli' | 'api' | 'repository'>
  privacy: 'local-capable' | 'remote-service' | 'mixed'
  url: string
  sourceLabel: string
  verifiedOn: string
}

export type ToolStage =
  | 'acquire'
  | 'inspect'
  | 'annotate'
  | 'compare'
  | 'literature'
  | 'record'

export interface ModelProfile {
  id: string
  name: string
  provider: string
  role: string
  positioning: string
  category: string[]
  strengths: string[]
  weaknesses: string[]
  bestUsedFor: string[]
  avoid: string[]
  before: string[]
  during: string[]
  after: string[]
  source: string
  verifiedOn: string
  officialClaims?: string[]
}

export interface PromptRecipe {
  id: string
  title: string
  group: 'coding' | 'biology' | 'analysis' | 'visualization'
  description: string
  body: string
}

export type TaskKind =
  | 'analyze_genome'
  | 'build_visualization'
  | 'review_literature'
  | 'write_grant'
  | 'create_software'
  | 'organize_project'

export interface RouterOptions {
  privateData: boolean
  speedFirst: boolean
  existingRepository: boolean
}

export interface AgentRouteStep {
  id: string
  actor: string
  role: string
  why: string
  prompt: string
  kind: 'human' | 'model' | 'tool' | 'gate'
}

export interface AgentRoute {
  task: TaskKind
  taskLabel: string
  steps: AgentRouteStep[]
  caution: string
  recipeId: string
}

export type DecisionKind =
  | 'observation'
  | 'hypothesis'
  | 'unknown'
  | 'validation_priority'
  | 'decision'

export interface DecisionEntry {
  id: string
  projectId: string
  kind: DecisionKind
  title: string
  detail: string
  source: string
  createdAt: string
  demo?: boolean
}
