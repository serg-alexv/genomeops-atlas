import { FileText, FlaskConical, HelpCircle, Network, Search } from 'lucide-react'
import { StatusBadge, statusLabels } from './StatusBadge'
import type { EvidenceNode, EvidenceStatus, GenomeProject } from '../types'

interface EvidenceMapProps {
  project: GenomeProject
  selectedNodeId: string
  onNodeSelect: (node: EvidenceNode) => void
  statusFilter: EvidenceStatus | 'all'
  onStatusFilter: (status: EvidenceStatus | 'all') => void
}

const nodeIcon = (node: EvidenceNode) => {
  if (node.kind === 'source') return FileText
  if (node.kind === 'question') return HelpCircle
  if (node.kind === 'gene') return Network
  if (node.kind === 'phenotype' || node.kind === 'factor') return FlaskConical
  return Search
}

export function EvidenceMap({
  project,
  selectedNodeId,
  onNodeSelect,
  statusFilter,
  onStatusFilter,
}: EvidenceMapProps) {
  const filters: Array<EvidenceStatus | 'all'> = [
    'all',
    'confirmed',
    'predicted',
    'unknown',
    'needs_validation',
  ]
  const nodeById = new Map(project.nodes.map((node) => [node.id, node]))

  return (
    <section className="evidence-map-panel" aria-label="Evidence relationship map">
      <div className="evidence-toolbar">
        <div>
          <span className="section-label">Relationship canvas</span>
          <strong>{project.nodes.length} nodes · {project.edges.length} links</strong>
        </div>
        <div className="status-filters" aria-label="Filter evidence status">
          {filters.map((filter) => (
            <button
              key={filter}
              className={statusFilter === filter ? 'status-filter is-active' : 'status-filter'}
              onClick={() => onStatusFilter(filter)}
              aria-pressed={statusFilter === filter}
            >
              {filter === 'all' ? 'all states' : statusLabels[filter]}
            </button>
          ))}
        </div>
      </div>

      <div className="evidence-canvas">
        <div className="coordinate coordinate-top">EVIDENCE / 01—{project.index}</div>
        <div className="coordinate coordinate-side">SOURCE → CLAIM → DECISION</div>
        <svg className="evidence-links" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {project.edges.map((edge) => {
            const from = nodeById.get(edge.from)
            const to = nodeById.get(edge.to)
            if (!from || !to) return null
            const muted = statusFilter !== 'all' && from.status !== statusFilter && to.status !== statusFilter
            return (
              <line
                key={`${edge.from}-${edge.to}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className={muted ? 'evidence-link is-muted' : 'evidence-link'}
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </svg>

        {project.nodes.map((node) => {
          const Icon = nodeIcon(node)
          const dimmed = statusFilter !== 'all' && node.status !== statusFilter
          const selected = selectedNodeId === node.id
          return (
            <button
              key={node.id}
              className={`evidence-node status-${node.status}${selected ? ' is-selected' : ''}${dimmed ? ' is-dimmed' : ''}`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              onClick={() => onNodeSelect(node)}
              aria-pressed={selected}
              aria-label={`${node.label}, ${statusLabels[node.status]}`}
            >
              <span className="node-icon"><Icon size={14} strokeWidth={1.8} aria-hidden="true" /></span>
              <span className="node-copy">
                <strong>{node.label}</strong>
                <span>{node.kind}</span>
              </span>
            </button>
          )
        })}

        <div className="canvas-legend" aria-label="Evidence status legend">
          {(['confirmed', 'predicted', 'unknown', 'needs_validation'] as EvidenceStatus[]).map((status) => (
            <StatusBadge key={status} status={status} compact />
          ))}
        </div>
      </div>
    </section>
  )
}
