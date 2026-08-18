import { ArrowUpRight, CircleDot, Network, ShieldCheck } from 'lucide-react'
import { StatusBadge } from '../components/StatusBadge'
import type { EvidenceStatus, GenomeProject } from '../types'

interface ProjectsViewProps {
  projects: GenomeProject[]
  onOpen: (id: string) => void
}

const statusCount = (project: GenomeProject, status: EvidenceStatus) =>
  project.nodes.filter((node) => node.status === status).length

export function ProjectsView({ projects, onOpen }: ProjectsViewProps) {
  return (
    <div className="content-view projects-view">
      <header className="view-intro split-intro">
        <div>
          <span className="section-label">Genome project navigator</span>
          <h1>Three research threads.<br />One evidence grammar.</h1>
        </div>
        <p>
          Move from question to source to decision without letting a plausible model output quietly become a fact.
          These seeded records are demo scaffolds, not imported experimental results.
        </p>
      </header>

      <section className="project-table" aria-label="Project catalogue">
        <div className="project-table-head">
          <span>Project</span>
          <span>Evidence state</span>
          <span>Open boundary</span>
          <span aria-hidden="true" />
        </div>
        {projects.map((project) => (
          <article className="project-row" key={project.id}>
            <div className="project-row-title">
              <span className="large-index">{project.index}</span>
              <div>
                <h2>{project.title}</h2>
                <span>{project.organism}</span>
              </div>
            </div>
            <div className="project-status-stack">
              {(['confirmed', 'predicted', 'unknown', 'needs_validation'] as EvidenceStatus[]).map((status) => {
                const count = statusCount(project, status)
                if (!count) return null
                return (
                  <span key={status} className="project-status-count">
                    <StatusBadge status={status} compact />
                    <strong>{count}</strong>
                  </span>
                )
              })}
            </div>
            <div className="project-boundary">
              <CircleDot size={15} aria-hidden="true" />
              <span>{project.unknowns[0]}</span>
            </div>
            <button className="row-open-button" onClick={() => onOpen(project.id)} aria-label={`Open ${project.title}`}>
              <ArrowUpRight size={18} aria-hidden="true" />
            </button>
          </article>
        ))}
      </section>

      <section className="project-principles">
        <div className="principle-mark"><Network size={23} aria-hidden="true" /></div>
        <div>
          <span className="section-label">Shared project contract</span>
          <h2>Claim promotion is a human-controlled state change.</h2>
        </div>
        <div className="principle-list">
          <p><ShieldCheck size={15} aria-hidden="true" /> Observation is kept separate from interpretation.</p>
          <p><ShieldCheck size={15} aria-hidden="true" /> Every material claim carries source and evidence type.</p>
          <p><ShieldCheck size={15} aria-hidden="true" /> Model consensus cannot create experimental confirmation.</p>
        </div>
      </section>
    </div>
  )
}
