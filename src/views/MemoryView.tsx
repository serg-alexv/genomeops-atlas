import { useMemo, useState, type FormEvent } from 'react'
import { Download, Plus, Trash2 } from 'lucide-react'
import { downloadText } from '../lib/export'
import type { DecisionEntry, DecisionKind, GenomeProject } from '../types'

interface MemoryViewProps {
  projects: GenomeProject[]
  selectedProjectId: string
  entries: DecisionEntry[]
  onEntriesChange: (entries: DecisionEntry[]) => void
}

const kindLabels: Record<DecisionKind, string> = {
  observation: 'observation',
  hypothesis: 'hypothesis',
  unknown: 'unknown',
  validation_priority: 'validation priority',
  decision: 'decision',
}

export function MemoryView({ projects, selectedProjectId, entries, onEntriesChange }: MemoryViewProps) {
  const [projectFilter, setProjectFilter] = useState(selectedProjectId)
  const [kindFilter, setKindFilter] = useState<DecisionKind | 'all'>('all')
  const [form, setForm] = useState({
    kind: 'unknown' as DecisionKind,
    title: '',
    detail: '',
    source: '',
  })

  const visibleEntries = useMemo(
    () => entries.filter((entry) =>
      (projectFilter === 'all' || entry.projectId === projectFilter) &&
      (kindFilter === 'all' || entry.kind === kindFilter),
    ),
    [entries, kindFilter, projectFilter],
  )

  const addEntry = (event: FormEvent) => {
    event.preventDefault()
    if (!form.title.trim() || !form.detail.trim()) return
    const projectId = projectFilter === 'all' ? selectedProjectId : projectFilter
    const next: DecisionEntry = {
      id: globalThis.crypto?.randomUUID?.() ?? `decision-${Date.now()}`,
      projectId,
      kind: form.kind,
      title: form.title.trim(),
      detail: form.detail.trim(),
      source: form.source.trim() || 'source missing',
      createdAt: new Date().toISOString(),
    }
    onEntriesChange([next, ...entries])
    setForm({ kind: 'unknown', title: '', detail: '', source: '' })
  }

  return (
    <div className="content-view memory-view">
      <header className="view-intro split-intro">
        <div>
          <span className="section-label">Research Memory</span>
          <h1>Record the decision.<br />Preserve the doubt.</h1>
        </div>
        <p>
          Entries stay in this browser in the pilot. Export them before clearing site data; GitHub synchronization is an upgrade path, not a simulated feature.
        </p>
      </header>

      <section className="memory-toolbar">
        <label>
          <span>Project</span>
          <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
            <option value="all">All projects</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
          </select>
        </label>
        <label>
          <span>Entry type</span>
          <select value={kindFilter} onChange={(event) => setKindFilter(event.target.value as DecisionKind | 'all')}>
            <option value="all">All types</option>
            {(Object.keys(kindLabels) as DecisionKind[]).map((kind) => <option key={kind} value={kind}>{kindLabels[kind]}</option>)}
          </select>
        </label>
        <button
          className="secondary-action"
          onClick={() => downloadText('genomeops-research-memory.json', JSON.stringify(entries, null, 2), 'application/json')}
        >
          <Download size={15} aria-hidden="true" />
          Export JSON
        </button>
      </section>

      <div className="memory-layout">
        <section className="memory-timeline" aria-label="Decision timeline">
          <div className="timeline-rule" aria-hidden="true" />
          {visibleEntries.map((entry) => {
            const project = projects.find((item) => item.id === entry.projectId)
            return (
              <article className="memory-entry" key={entry.id}>
                <span className={`memory-node kind-${entry.kind}`} aria-hidden="true" />
                <div className="memory-meta">
                  <span>{kindLabels[entry.kind]}</span>
                  <time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</time>
                </div>
                <h2>{entry.title}</h2>
                <p>{entry.detail}</p>
                <div className="memory-source">
                  <span>{project?.shortTitle ?? 'Unknown project'}</span>
                  <span>source: {entry.source}</span>
                  {entry.demo ? <span>demo seed</span> : null}
                </div>
                {!entry.demo ? (
                  <button
                    className="delete-entry"
                    onClick={() => onEntriesChange(entries.filter((item) => item.id !== entry.id))}
                    aria-label={`Delete ${entry.title}`}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                ) : null}
              </article>
            )
          })}
          {!visibleEntries.length ? <div className="empty-memory">No entries match this filter.</div> : null}
        </section>

        <form className="memory-form" onSubmit={addEntry}>
          <div>
            <span className="section-label">New memory entry</span>
            <h2>Capture a bounded update</h2>
          </div>
          <label>
            <span>Type</span>
            <select value={form.kind} onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value as DecisionKind }))}>
              {(Object.keys(kindLabels) as DecisionKind[]).map((kind) => <option key={kind} value={kind}>{kindLabels[kind]}</option>)}
            </select>
          </label>
          <label>
            <span>Title</span>
            <input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="What changed?" />
          </label>
          <label>
            <span>Detail</span>
            <textarea required rows={5} value={form.detail} onChange={(event) => setForm((current) => ({ ...current, detail: event.target.value }))} placeholder="Observation, interpretation, uncertainty, next boundary…" />
          </label>
          <label>
            <span>Source or artifact</span>
            <input value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} placeholder="DOI, accession, repository path, or source missing" />
          </label>
          <button className="primary-action wide-action" type="submit">
            <Plus size={16} aria-hidden="true" />
            Add to memory
          </button>
          <p className="form-boundary">Local browser storage only. Adding an entry does not write to GitHub or contact another service.</p>
        </form>
      </div>
    </div>
  )
}
