import { ChevronRight } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import type { EvidenceStatus, GenomeProject } from '../types'

interface ProjectRailProps {
  projects: GenomeProject[]
  selectedId: string
  onSelect: (id: string) => void
}

const priorityStatus = (project: GenomeProject): EvidenceStatus => {
  if (project.nodes.some((node) => node.status === 'needs_validation')) return 'needs_validation'
  if (project.nodes.some((node) => node.status === 'unknown')) return 'unknown'
  if (project.nodes.some((node) => node.status === 'predicted')) return 'predicted'
  return 'confirmed'
}

export function ProjectRail({ projects, selectedId, onSelect }: ProjectRailProps) {
  return (
    <aside className="project-rail" aria-label="Genome projects">
      <div className="rail-heading">
        <span>Projects</span>
        <span className="rail-count">{String(projects.length).padStart(2, '0')}</span>
      </div>
      <div className="project-list">
        {projects.map((project) => {
          const active = project.id === selectedId
          return (
            <button
              key={project.id}
              className={active ? 'project-rail-item is-active' : 'project-rail-item'}
              onClick={() => onSelect(project.id)}
              aria-pressed={active}
              aria-label={`Open project ${project.title}`}
            >
              <span className="project-index">{project.index}</span>
              <span className="project-rail-copy">
                <strong>{project.title}</strong>
                <span>{project.organism}</span>
                <StatusBadge status={priorityStatus(project)} compact />
              </span>
              <ChevronRight size={15} className="project-chevron" aria-hidden="true" />
            </button>
          )
        })}
      </div>
      <div className="rail-note">
        <span className="rail-note-line" aria-hidden="true" />
        <p>Demo corpus</p>
        <span>No automatic account import. Every source needs an explicit boundary.</span>
      </div>
    </aside>
  )
}
