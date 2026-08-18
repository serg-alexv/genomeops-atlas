import { useEffect, useMemo, useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { ProjectRail } from '../components/ProjectRail'
import { projects, getProject } from '../data/projects'
import { buildProjectBrief, downloadText } from '../lib/export'
import { loadDecisions, saveDecisions } from '../lib/storage'
import { EvidenceView } from '../views/EvidenceView'
import { MemoryView } from '../views/MemoryView'
import { ProjectsView } from '../views/ProjectsView'
import { PromptStudio } from '../views/PromptStudio'
import { ToolAdvisor } from '../views/ToolAdvisor'
import { WorkforceView } from '../views/WorkforceView'
import type { DecisionEntry, EvidenceNode, EvidenceStatus, ViewId } from '../types'

const validViews: ViewId[] = ['projects', 'prompt', 'evidence', 'tools', 'workforce', 'memory']

const readHashView = (): ViewId => {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const value = params.get('view') as ViewId | null
  return value && validViews.includes(value) ? value : 'evidence'
}

export function AdvancedAtlas() {
  const [view, setViewState] = useState<ViewId>(readHashView)
  const [selectedProjectId, setSelectedProjectId] = useState(() =>
    window.localStorage.getItem('genomeops-atlas:selected-project') ?? projects[0].id,
  )
  const project = getProject(selectedProjectId)
  const [selectedNodeId, setSelectedNodeId] = useState(project.nodes[0].id)
  const [statusFilter, setStatusFilter] = useState<EvidenceStatus | 'all'>('all')
  const [entries, setEntries] = useState<DecisionEntry[]>(loadDecisions)
  const [toast, setToast] = useState('')

  const selectedNode = useMemo(
    () => project.nodes.find((node) => node.id === selectedNodeId) ?? project.nodes[0],
    [project, selectedNodeId],
  )

  useEffect(() => {
    const handleHashChange = () => setViewState(readHashView())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('genomeops-atlas:selected-project', project.id)
    if (!project.nodes.some((node) => node.id === selectedNodeId)) {
      setSelectedNodeId(project.nodes[0].id)
    }
  }, [project, selectedNodeId])

  useEffect(() => saveDecisions(entries), [entries])

  const setView = (next: ViewId) => {
    setViewState(next)
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    params.set('mode', 'advanced')
    params.set('view', next)
    window.history.replaceState(null, '', `#${params.toString()}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const selectProject = (id: string) => {
    const nextProject = getProject(id)
    setSelectedProjectId(nextProject.id)
    setSelectedNodeId(nextProject.nodes[0].id)
    setStatusFilter('all')
    setView('evidence')
  }

  const selectNode = (node: EvidenceNode) => setSelectedNodeId(node.id)

  const exportBrief = () => {
    downloadText(
      `${project.id}-genomeops-brief.md`,
      buildProjectBrief(project, entries),
      'text/markdown',
    )
    setToast('Project brief exported')
    window.setTimeout(() => setToast(''), 1800)
  }

  return (
    <div className="app-root">
      <AppHeader view={view} onViewChange={setView} onExport={exportBrief} />
      <div className="app-grid">
        <ProjectRail projects={projects} selectedId={project.id} onSelect={selectProject} />
        <main className="main-canvas">
          {view === 'projects' ? <ProjectsView projects={projects} onOpen={selectProject} /> : null}
          {view === 'prompt' ? <PromptStudio key={project.id} project={project} /> : null}
          {view === 'evidence' ? (
            <EvidenceView
              project={project}
              selectedNode={selectedNode}
              onNodeSelect={selectNode}
              onViewChange={setView}
              statusFilter={statusFilter}
              onStatusFilter={setStatusFilter}
            />
          ) : null}
          {view === 'tools' ? <ToolAdvisor /> : null}
          {view === 'workforce' ? <WorkforceView /> : null}
          {view === 'memory' ? (
            <MemoryView
              projects={projects}
              selectedProjectId={project.id}
              entries={entries}
              onEntriesChange={setEntries}
            />
          ) : null}
          <footer className="app-footer">
            <span>GenomeOps Atlas / pilot v0.2</span>
            <span>Demo data · source-linked · local-first</span>
            <span>Advisory output ≠ experimental validation</span>
          </footer>
        </main>
      </div>
      <div className={toast ? 'toast is-visible' : 'toast'} role="status" aria-live="polite">{toast}</div>
    </div>
  )
}
