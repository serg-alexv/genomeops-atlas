import { useMemo, useState } from 'react'
import { ArrowUpRight, CheckCircle2, ExternalLink, Laptop, ShieldCheck } from 'lucide-react'
import { tools } from '../data/tools'
import type { ToolStage } from '../types'

const stages: Array<{ id: ToolStage; label: string; question: string }> = [
  { id: 'acquire', label: 'Acquire', question: 'I need a traceable genome package' },
  { id: 'inspect', label: 'Inspect', question: 'I need to look at sequence context or tracks' },
  { id: 'annotate', label: 'Annotate', question: 'I need a bacterial annotation baseline' },
  { id: 'compare', label: 'Compare', question: 'I need identifiers or protein context' },
  { id: 'literature', label: 'Literature', question: 'I need primary source candidates' },
  { id: 'record', label: 'Record', question: 'I need versioned memory or automation' },
]

export function ToolAdvisor() {
  const [stage, setStage] = useState<ToolStage>('acquire')
  const [localOnly, setLocalOnly] = useState(false)
  const [selectedId, setSelectedId] = useState('ncbi-datasets')

  const recommendations = useMemo(() => {
    const matches = tools.filter((tool) => tool.stage === stage)
    if (!localOnly) return matches
    return matches.filter((tool) => tool.privacy !== 'remote-service')
  }, [localOnly, stage])
  const selected = tools.find((tool) => tool.id === selectedId) ?? recommendations[0] ?? tools[0]

  return (
    <div className="content-view tools-view">
      <header className="view-intro split-intro">
        <div>
          <span className="section-label">External Tool Advisor</span>
          <h1>Choose by evidence task,<br />not by tool popularity.</h1>
        </div>
        <p>
          Current links point to primary documentation. The advisor explains what each tool can contribute and what provenance must travel with its output.
        </p>
      </header>

      <section className="advisor-control-plane">
        <div className="advisor-question">
          <span className="section-label">What are you doing?</span>
          <div className="stage-list" role="radiogroup" aria-label="Analysis stage">
            {stages.map((item, index) => (
              <button
                key={item.id}
                className={stage === item.id ? 'stage-option is-active' : 'stage-option'}
                onClick={() => {
                  setStage(item.id)
                  const first = tools.find((tool) => tool.stage === item.id)
                  if (first) setSelectedId(first.id)
                }}
                role="radio"
                aria-checked={stage === item.id}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{item.label}</strong>
                <small>{item.question}</small>
              </button>
            ))}
          </div>
          <label className="toggle-row">
            <input type="checkbox" checked={localOnly} onChange={(event) => setLocalOnly(event.target.checked)} />
            <span className="toggle-ui" aria-hidden="true" />
            <span>
              <strong>Prefer local-capable tools</strong>
              <small>Filter out remote-only services; verify the real data boundary separately.</small>
            </span>
          </label>
        </div>

        <div className="advisor-result">
          <div className="advisor-result-header">
            <span className="section-label">Recommended lane</span>
            <span>{recommendations.length || 0} match{recommendations.length === 1 ? '' : 'es'}</span>
          </div>
          {recommendations.length ? (
            <div className="tool-result-list">
              {recommendations.map((tool) => (
                <button
                  key={tool.id}
                  className={tool.id === selected.id ? 'tool-result is-active' : 'tool-result'}
                  onClick={() => setSelectedId(tool.id)}
                >
                  <span className="tool-mode-icon"><Laptop size={16} aria-hidden="true" /></span>
                  <span><strong>{tool.name}</strong><small>{tool.useFor}</small></span>
                  <ArrowUpRight size={17} aria-hidden="true" />
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-result">
              <ShieldCheck size={22} aria-hidden="true" />
              <h2>No local-capable match in this stage.</h2>
              <p>Change the stage or relax the filter. “Local” still requires runtime, network, log, and storage verification.</p>
            </div>
          )}
        </div>
      </section>

      <section className="tool-detail">
        <div className="tool-detail-title">
          <span className="tool-large-index">{String(tools.findIndex((tool) => tool.id === selected.id) + 1).padStart(2, '0')}</span>
          <div>
            <span className="section-label">{selected.stage} / {selected.privacy}</span>
            <h2>{selected.name}</h2>
            <p>{selected.useFor}</p>
          </div>
        </div>
        <div className="tool-detail-columns">
          <div>
            <span>Why this lane</span>
            <p>{selected.why}</p>
          </div>
          <div>
            <span>Provenance check</span>
            <p>{selected.watchFor}</p>
          </div>
          <div>
            <span>Interfaces</span>
            <p className="mode-list">{selected.modes.join(' · ')}</p>
          </div>
        </div>
        <a className="primary-action tool-source-action" href={selected.url} target="_blank" rel="noreferrer">
          Open official source
          <ExternalLink size={15} aria-hidden="true" />
        </a>
        <div className="verified-line"><CheckCircle2 size={14} aria-hidden="true" /> Link checked {selected.verifiedOn} · {selected.sourceLabel}</div>
      </section>
    </div>
  )
}
