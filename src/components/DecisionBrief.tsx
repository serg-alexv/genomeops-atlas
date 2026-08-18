import { ArrowRight, ExternalLink, Link2, ShieldCheck } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import type { EvidenceNode, GenomeProject } from '../types'

interface DecisionBriefProps {
  project: GenomeProject
  node: EvidenceNode
  onBuildPrompt: () => void
}

export function DecisionBrief({ project, node, onBuildPrompt }: DecisionBriefProps) {
  return (
    <aside className="decision-brief">
      <div className="decision-heading">
        <div>
          <span className="section-label">Decision brief</span>
          <h2>{node.label}</h2>
        </div>
        <StatusBadge status={node.status} compact />
      </div>

      <div className="decision-section">
        <span>Current question</span>
        <p>{project.question}</p>
      </div>

      <div className="decision-section">
        <span>Evidence state</span>
        <p>{node.summary}</p>
        <div className="evidence-line">
          <Link2 size={14} aria-hidden="true" />
          <span>{node.evidence}</span>
        </div>
      </div>

      <div className="decision-section">
        <span>Next information check</span>
        <p>{node.nextCheck}</p>
      </div>

      <button className="primary-action" onClick={onBuildPrompt}>
        Build advisory prompt
        <ArrowRight size={16} aria-hidden="true" />
      </button>

      <div className="boundary-note">
        <ShieldCheck size={16} aria-hidden="true" />
        <p>
          <strong>Promotion gate</strong>
          This pilot cannot upgrade a biological claim to confirmed.
        </p>
      </div>

      <a className="source-link" href="https://www.ncbi.nlm.nih.gov/datasets/" target="_blank" rel="noreferrer">
        Open a primary data source
        <ExternalLink size={13} aria-hidden="true" />
      </a>
    </aside>
  )
}
