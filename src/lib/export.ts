import type { AgentRoute, DecisionEntry, GenomeProject } from '../types'

export const downloadText = (filename: string, content: string, type = 'text/plain') => {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export const buildProjectBrief = (
  project: GenomeProject,
  decisions: DecisionEntry[],
  route?: AgentRoute,
) => {
  const evidenceRows = project.nodes
    .map((node) => `- ${node.label}: ${node.status.replace('_', ' ')} — ${node.summary}`)
    .join('\n')
  const decisionRows = decisions
    .filter((entry) => entry.projectId === project.id)
    .map((entry) => `- [${entry.kind}] ${entry.title}: ${entry.detail} (source: ${entry.source || 'missing'})`)
    .join('\n')
  const routeRows = route
    ? route.steps.map((item, index) => `${index + 1}. ${item.actor} — ${item.role}`).join('\n')
    : 'No agent route selected.'

  return `# ${project.title} — GenomeOps Atlas brief

Generated: ${new Date().toISOString()}
Data boundary: demo data; source-linked promotion required.

## Current question

${project.question}

## Evidence map

${evidenceRows}

## Unknowns

${project.unknowns.map((item) => `- ${item}`).join('\n')}

## Decision memory

${decisionRows || '- No project decisions recorded.'}

## Current agent route

${routeRows}

## Boundary

This brief is advisory. A build or deployment result does not validate a biological claim, and model consensus is not experimental evidence.
`
}
