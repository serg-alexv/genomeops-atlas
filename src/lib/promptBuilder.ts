export type PromptTemplateId =
  | 'annotation-review'
  | 'literature-mining'
  | 'contradiction-audit'
  | 'implementation-brief'

export interface PromptBuilderInput {
  template: PromptTemplateId
  organism: string
  goal: string
  availableData: string
  question: string
  confidenceThreshold: 'exploratory' | 'source-linked' | 'decision-ready'
}

export const promptTemplates: Array<{
  id: PromptTemplateId
  name: string
  description: string
}> = [
  {
    id: 'annotation-review',
    name: 'Genome annotation reviewer',
    description: 'Audit annotations and expose missing provenance.',
  },
  {
    id: 'literature-mining',
    name: 'Literature mining brief',
    description: 'Retrieve source candidates and extract bounded claims.',
  },
  {
    id: 'contradiction-audit',
    name: 'Cross-model contradiction audit',
    description: 'Compare assumptions, sources, and unresolved disagreements.',
  },
  {
    id: 'implementation-brief',
    name: 'Scientific software implementation',
    description: 'Turn a reviewed architecture into a focused engineering task.',
  },
]

const roleByTemplate: Record<PromptTemplateId, string> = {
  'annotation-review': 'microbial genome analysis reviewer',
  'literature-mining': 'scientific literature intelligence analyst',
  'contradiction-audit': 'adversarial evidence and assumption auditor',
  'implementation-brief': 'scientific software implementation agent',
}

const taskByTemplate: Record<PromptTemplateId, string> = {
  'annotation-review':
    'Review the supplied genome annotations and project notes. Do not infer function from a label alone.',
  'literature-mining':
    'Develop a reproducible source-discovery plan, then synthesize only claims that can be linked to retrieved sources.',
  'contradiction-audit':
    'Compare the supplied analyses. Identify differences in inputs, definitions, assumptions, and source support.',
  'implementation-brief':
    'Inspect the existing repository first, then implement only the scoped change with the minimum coherent diff.',
}

export const buildAdvisoryPrompt = (input: PromptBuilderInput): string => {
  const confidence = {
    exploratory: 'Exploratory: hypotheses are allowed, but label them and never present them as findings.',
    'source-linked': 'Source-linked: every material claim needs a retrievable source and evidence type.',
    'decision-ready':
      'Decision-ready: include provenance, competing explanations, failure modes, and a clear human decision gate.',
  }[input.confidenceThreshold]

  return `You are a ${roleByTemplate[input.template]}.

PROJECT CONTEXT
Organism or scope: ${input.organism || '[not supplied]'}
Goal: ${input.goal || '[not supplied]'}
Available data: ${input.availableData || '[not supplied]'}
Question: ${input.question || '[not supplied]'}

TASK
${taskByTemplate[input.template]}

EVIDENCE DISCIPLINE
- Separate direct observations, experimentally supported claims, computational predictions, model inferences, and unknowns.
- For every material claim, give the source or say “source missing”.
- Do not invent sequences, citations, measurements, repository state, or experimental parameters.
- Model agreement is not validation. Expose disagreement and the assumptions behind it.
- ${confidence}

OUTPUT
1. Confirmed facts — only source-linked or directly observed
2. Predictions — method and assumptions
3. Missing evidence — exact gaps
4. Competing hypotheses — what would distinguish them
5. Recommended information-gathering step — safe, non-procedural, and reversible
6. Provenance ledger — source, date, evidence type, confidence

End with a short “Do not conclude yet” section naming any claim that remains unsupported.`
}
