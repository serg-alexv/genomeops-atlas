import { Database, GitCommitHorizontal, Sparkles } from 'lucide-react'
import { DecisionBrief } from '../components/DecisionBrief'
import { EvidenceMap } from '../components/EvidenceMap'
import type { EvidenceNode, EvidenceStatus, GenomeProject, ViewId } from '../types'

interface EvidenceViewProps {
  project: GenomeProject
  selectedNode: EvidenceNode
  onNodeSelect: (node: EvidenceNode) => void
  onViewChange: (view: ViewId) => void
  statusFilter: EvidenceStatus | 'all'
  onStatusFilter: (status: EvidenceStatus | 'all') => void
}

export function EvidenceView({
  project,
  selectedNode,
  onNodeSelect,
  onViewChange,
  statusFilter,
  onStatusFilter,
}: EvidenceViewProps) {
  return (
    <div className="content-view evidence-view">
      <header className="evidence-intro">
        <div>
          <span className="section-label">{project.organism} / project {project.index}</span>
          <h1>{project.title}</h1>
          <p>Trace claims from question to evidence before the next decision.</p>
        </div>
        <div className="provenance-chip">
          <Database size={15} aria-hidden="true" />
          <span>Demo data</span>
          <i aria-hidden="true" />
          <span>source-linked</span>
          <i aria-hidden="true" />
          <span>local-first</span>
        </div>
      </header>

      <div className="evidence-workspace">
        <EvidenceMap
          project={project}
          selectedNodeId={selectedNode.id}
          onNodeSelect={onNodeSelect}
          statusFilter={statusFilter}
          onStatusFilter={onStatusFilter}
        />
        <DecisionBrief project={project} node={selectedNode} onBuildPrompt={() => onViewChange('prompt')} />
      </div>

      <div className="workflow-dock" aria-label="Core workflow shortcuts">
        <button onClick={() => onViewChange('prompt')}>
          <span className="dock-number">01</span>
          <Sparkles size={17} aria-hidden="true" />
          <span><strong>Prompt Studio</strong><small>Turn the selected question into an evidence-aware brief.</small></span>
        </button>
        <button onClick={() => onViewChange('tools')}>
          <span className="dock-number">02</span>
          <Database size={17} aria-hidden="true" />
          <span><strong>Tool Advisor</strong><small>Choose a source or analysis tool by task and boundary.</small></span>
        </button>
        <button onClick={() => onViewChange('memory')}>
          <span className="dock-number">03</span>
          <GitCommitHorizontal size={17} aria-hidden="true" />
          <span><strong>Research Memory</strong><small>Record the decision, not just the generated answer.</small></span>
        </button>
      </div>
    </div>
  )
}
