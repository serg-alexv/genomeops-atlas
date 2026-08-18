import type {
  AgentRoute,
  AgentRouteStep,
  RouterOptions,
  TaskKind,
} from '../types'

export const taskChoices: Array<{ id: TaskKind; label: string; hint: string }> = [
  { id: 'analyze_genome', label: 'Analyze genome', hint: 'Evidence synthesis and competing hypotheses' },
  { id: 'build_visualization', label: 'Build visualization', hint: 'Architecture, UI loop, review, deploy' },
  { id: 'review_literature', label: 'Review literature', hint: 'Discovery, retrieval, synthesis, critique' },
  { id: 'write_grant', label: 'Write grant', hint: 'Claims ledger, narrative, human approval' },
  { id: 'create_software', label: 'Create software', hint: 'Repository-first engineering workflow' },
  { id: 'organize_project', label: 'Organize project', hint: 'Memory, decisions, automation' },
]

const step = (
  id: string,
  actor: string,
  role: string,
  why: string,
  prompt: string,
  kind: AgentRouteStep['kind'] = 'model',
): AgentRouteStep => ({ id, actor, role, why, prompt, kind })

const humanGate = step(
  'human-gate',
  'Human owner',
  'Decision and publication gate',
  'Scientific interpretation and external publication remain owner-controlled.',
  'Review the evidence ledger, unresolved risks, and exact diff before approval.',
  'gate',
)

const codeVerification = step(
  'github-actions',
  'GitHub Actions',
  'Deterministic code verification',
  'Runs the repository’s lint, tests, and production build on a clean runner.',
  'Run the pinned verification workflow and report the immutable commit SHA.',
  'tool',
)

const privateLane = step(
  'local-model',
  'Verified local model',
  'Private preprocessing lane',
  'Keeps sensitive material inside a verified local runtime when the actual boundary supports that claim.',
  'Extract structure only. Preserve file provenance and do not make biological conclusions.',
)

const architectureStep = step(
  'architecture',
  'GPT reasoning + Codex architecture',
  'Architecture and ambiguity resolution',
  'Defines evidence states, data model, components, and verification before fast implementation begins.',
  'Inspect context, identify unknowns, and return a typed architecture with explicit evidence and publication gates.',
)

const sparkStep = step(
  'spark',
  'GPT-5.3-Codex-Spark',
  'Fast implementation loop',
  'Best positioned for near-instant, focused coding iteration after the task is scoped.',
  'Inspect the current architecture. Make only the requested edit, touch the minimum files, run the smallest relevant check, and report the remaining boundary.',
)

const copilotStep = step(
  'copilot',
  'GitHub Copilot',
  'IDE-side implementation companion',
  'Adds inline feedback while the repository and test suite remain the source of truth.',
  'Suggest focused code or tests inside the established architecture; do not bypass review gates.',
)

const deployStep = step(
  'vercel',
  'Vercel',
  'Preview and production deployment',
  'Publishes the verified web artifact and creates a retrievable deployment record.',
  'Deploy the tested commit, verify the live workflow, and keep promotion owner-controlled.',
  'tool',
)

export const inferTaskKind = (text: string, fallback: TaskKind): TaskKind => {
  const normalized = text.toLowerCase()
  if (/grant|proposal|funding/.test(normalized)) return 'write_grant'
  if (/paper|literature|review|publication/.test(normalized)) return 'review_literature'
  if (/dashboard|visuali[sz]|chart|frontend|ui/.test(normalized)) return 'build_visualization'
  if (/repo|software|react|typescript|app|code/.test(normalized)) return 'create_software'
  if (/organize|memory|decision|project/.test(normalized)) return 'organize_project'
  if (/genome|annotation|gene|sequence/.test(normalized)) return 'analyze_genome'
  return fallback
}

export const buildAgentRoute = (
  requestedTask: TaskKind,
  freeText: string,
  options: RouterOptions,
): AgentRoute => {
  // An explicit task selection is authoritative. The UI still uses
  // `inferTaskKind` while the user types, but a later radio selection must not
  // be silently overridden by stale text from the previous route.
  const task = requestedTask
  const maybePrivate = options.privateData ? [privateLane] : []
  const maybeCopilot = options.existingRepository ? [copilotStep] : []

  const definitions: Record<TaskKind, Omit<AgentRoute, 'task'>> = {
    analyze_genome: {
      taskLabel: 'Analyze genome evidence',
      recipeId: 'evidence-first-genome-analysis',
      caution: 'No model is the experimental authority. Claims remain predicted or unknown until source or observation evidence is attached.',
      steps: [
        ...maybePrivate,
        step(
          'reasoning',
          'GPT reasoning model',
          'Evidence synthesis',
          'Separates observations, predictions, missing evidence, and competing hypotheses.',
          'Build a claim table with evidence type, source, uncertainty, and the next discriminating question.',
        ),
        step(
          'gemini',
          'Gemini',
          'Breadth and multimodal second pass',
          'Expands search vocabulary or reviews figures as an independent advisory lane.',
          'Return candidate sources and alternative interpretations; mark every unverified citation.',
        ),
        step(
          'critic',
          'Claude review lane',
          'Critical review',
          'Challenges causal leaps, missing caveats, and source fidelity.',
          'Audit the synthesis for unsupported conclusions and missing controls.',
        ),
        humanGate,
      ],
    },
    build_visualization: {
      taskLabel: 'Build a scientific visualization',
      recipeId: 'scientific-app-frontend',
      caution: 'Spark accelerates the implementation loop; it does not own the scientific model or the final architecture.',
      steps: [architectureStep, sparkStep, ...maybeCopilot, codeVerification, deployStep, humanGate],
    },
    review_literature: {
      taskLabel: 'Review scientific literature',
      recipeId: 'cross-model-review',
      caution: 'Discovery output is not a bibliography until every source is retrieved and checked.',
      steps: [
        ...maybePrivate,
        step(
          'retrieval',
          'PubMed + primary sources',
          'Source retrieval',
          'Creates the actual evidence corpus before synthesis.',
          'Record the query, date, inclusion criteria, DOI or accession, and retrieval status.',
          'tool',
        ),
        step(
          'breadth',
          'Gemini',
          'Literature breadth',
          'Suggests synonyms, adjacent mechanisms, and candidate records.',
          'Expand the search space; do not summarize an unretrieved source as fact.',
        ),
        step(
          'synthesis',
          'GPT reasoning model',
          'Source-linked synthesis',
          'Builds a mechanism and uncertainty map from retrieved material.',
          'Cite each claim and separate source statements from interpretation.',
        ),
        step(
          'writing-review',
          'Claude review lane',
          'Critical writing review',
          'Checks omissions, overclaiming, and clarity.',
          'Return an actionable critique without rewriting evidence boundaries away.',
        ),
        humanGate,
      ],
    },
    write_grant: {
      taskLabel: 'Prepare a grant draft',
      recipeId: 'cross-model-review',
      caution: 'The router drafts and reviews. It cannot certify eligibility, budget, citations, or submission state.',
      steps: [
        step(
          'claims-ledger',
          'Human + source ledger',
          'Scope and evidence baseline',
          'Sets funder, eligibility, claims, and owner constraints before prose generation.',
          'Provide the call text, allowed claims, evidence links, budget boundary, and submission owner.',
          'human',
        ),
        step(
          'grant-reasoning',
          'GPT reasoning model',
          'Argument architecture',
          'Turns the grounded claims ledger into aims, rationale, risks, and milestones.',
          'Draft from supplied evidence only; tag every unsupported statement.',
        ),
        step(
          'grant-review',
          'Claude review lane',
          'Clarity and reviewer critique',
          'Improves structure and anticipates reviewer objections.',
          'Challenge feasibility and overclaiming; preserve citation placeholders.',
        ),
        humanGate,
      ],
    },
    create_software: {
      taskLabel: 'Create scientific software',
      recipeId: options.speedFirst ? 'fast-ui-iteration' : 'repository-archaeology',
      caution: 'Fast generation is useful only inside a reviewed architecture and test loop.',
      steps: [architectureStep, sparkStep, ...maybeCopilot, codeVerification, deployStep, humanGate],
    },
    organize_project: {
      taskLabel: 'Organize a genome project',
      recipeId: 'repository-archaeology',
      caution: 'Automation may propose repository changes; it must not silently promote claims or publish externally.',
      steps: [
        ...maybePrivate,
        step(
          'inventory',
          'Codex repository archaeology',
          'Read-only project map',
          'Identifies artifacts, entry points, decisions, provenance, and gaps before restructuring.',
          'Scan without edits. Return canonical paths, unknowns, and a proposed minimal schema.',
        ),
        sparkStep,
        step(
          'repository',
          'GitHub repository',
          'Versioned research memory',
          'Stores projects, prompts, sources, model outputs, and decisions as reviewable history.',
          'Create a small reviewable commit; keep external publication explicit.',
          'tool',
        ),
        step(
          'scheduler',
          'Scheduled GitHub Action',
          'Bounded maintenance',
          'Can open a report or proposed change on a defined cadence.',
          'Run read-only checks with least privilege. Never mark a biological claim verified automatically.',
          'tool',
        ),
        humanGate,
      ],
    },
  }

  const definition = definitions[task]
  const taskContext = freeText.trim() || definition.taskLabel

  return {
    task,
    ...definition,
    steps: definition.steps.map((routeStep) => ({
      ...routeStep,
      prompt: `Task: ${taskContext}\n\n${routeStep.prompt}`,
    })),
  }
}
