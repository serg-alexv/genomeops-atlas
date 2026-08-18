import { useMemo, useState } from 'react'
import { ArrowDown, Check, Copy, ExternalLink, GitBranch, ShieldAlert, Zap } from 'lucide-react'
import { modelProfiles } from '../data/models'
import { promptRecipes } from '../data/recipes'
import { buildAgentRoute, inferTaskKind, taskChoices } from '../lib/router'
import type { RouterOptions, TaskKind } from '../types'

export function WorkforceView() {
  const [task, setTask] = useState<TaskKind>('build_visualization')
  const [freeText, setFreeText] = useState('Create a genome project dashboard')
  const [options, setOptions] = useState<RouterOptions>({
    privateData: false,
    speedFirst: true,
    existingRepository: true,
  })
  const [selectedModelId, setSelectedModelId] = useState('codex-spark')
  const [copiedStep, setCopiedStep] = useState('')

  const route = useMemo(() => buildAgentRoute(task, freeText, options), [task, freeText, options])
  const selectedModel = modelProfiles.find((model) => model.id === selectedModelId) ?? modelProfiles[0]
  const routeRecipe = promptRecipes.find((recipe) => recipe.id === route.recipeId) ?? promptRecipes[0]

  const toggle = (key: keyof RouterOptions) => {
    setOptions((current) => ({ ...current, [key]: !current[key] }))
  }

  const copyStepPrompt = async (id: string, prompt: string) => {
    await navigator.clipboard.writeText(prompt)
    setCopiedStep(id)
    window.setTimeout(() => setCopiedStep(''), 1400)
  }

  return (
    <div className="content-view workforce-view">
      <header className="view-intro split-intro">
        <div>
          <span className="section-label">AI Workforce Registry</span>
          <h1>A control plane for<br />scientific engineering.</h1>
        </div>
        <p>
          Route each task to the right job shape. Fast models accelerate bounded loops; evidence sources and human gates control scientific truth.
        </p>
      </header>

      <section className="router-simulator">
        <div className="router-inputs">
          <div className="panel-heading-row">
            <div>
              <span className="section-label">AI Consultant</span>
              <h2>Task → Agent Router</h2>
            </div>
            <span className="simulator-mark"><Zap size={14} aria-hidden="true" /> live simulation</span>
          </div>
          <label className="task-text-field">
            <span>Describe the task</span>
            <textarea
              value={freeText}
              onChange={(event) => {
                const nextText = event.target.value
                setFreeText(nextText)
                setTask((current) => inferTaskKind(nextText, current))
              }}
              rows={3}
            />
          </label>

          <div className="task-choice-grid" role="radiogroup" aria-label="Task type">
            {taskChoices.map((choice) => (
              <button
                key={choice.id}
                className={task === choice.id ? 'task-choice is-active' : 'task-choice'}
                onClick={() => setTask(choice.id)}
                role="radio"
                aria-checked={task === choice.id}
              >
                <span className="radio-dot" aria-hidden="true" />
                <span><strong>{choice.label}</strong><small>{choice.hint}</small></span>
              </button>
            ))}
          </div>

          <div className="router-options">
            <label><input type="checkbox" checked={options.privateData} onChange={() => toggle('privateData')} /> Private data</label>
            <label><input type="checkbox" checked={options.speedFirst} onChange={() => toggle('speedFirst')} /> Fast loop preferred</label>
            <label><input type="checkbox" checked={options.existingRepository} onChange={() => toggle('existingRepository')} /> Existing repository</label>
          </div>
        </div>

        <div className="route-output">
          <div className="route-output-header">
            <span className="section-label">Recommended agent stack</span>
            <h2>{route.taskLabel}</h2>
            <p>{route.caution}</p>
          </div>
          <div className="route-steps">
            {route.steps.map((routeStep, index) => (
              <div className={`route-step kind-${routeStep.kind}`} key={routeStep.id}>
                <span className="route-sequence">{String(index + 1).padStart(2, '0')}</span>
                <div className="route-step-copy">
                  <span>{routeStep.role}</span>
                  <strong>{routeStep.actor}</strong>
                  <p>{routeStep.why}</p>
                </div>
                <button onClick={() => copyStepPrompt(routeStep.id, routeStep.prompt)} aria-label={`Copy prompt for ${routeStep.actor}`}>
                  {copiedStep === routeStep.id ? <Check size={14} /> : <Copy size={14} />}
                </button>
                {index < route.steps.length - 1 ? <ArrowDown className="route-arrow" size={16} aria-hidden="true" /> : null}
              </div>
            ))}
          </div>
          <div className="route-recipe">
            <span>Attached recipe</span>
            <strong>{routeRecipe.title}</strong>
            <small>{routeRecipe.description}</small>
          </div>
        </div>
      </section>

      <section className="registry-section">
        <div className="registry-heading">
          <span className="section-label">Model corpus</span>
          <h2>Roles, limits, and workflow position</h2>
          <p>Vendor facts are source-linked. Role assignments are GenomeOps Atlas advisory policy.</p>
        </div>
        <div className="registry-layout">
          <div className="model-index">
            {modelProfiles.map((model, index) => (
              <button
                key={model.id}
                className={model.id === selectedModel.id ? 'model-index-item is-active' : 'model-index-item'}
                onClick={() => setSelectedModelId(model.id)}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <span><strong>{model.name}</strong><small>{model.role}</small></span>
              </button>
            ))}
          </div>
          <article className="model-profile">
            <div className="model-profile-header">
              <div>
                <span className="section-label">{selectedModel.provider}</span>
                <h3>{selectedModel.name}</h3>
                <p>{selectedModel.positioning}</p>
              </div>
              <a href={selectedModel.source} target="_blank" rel="noreferrer" aria-label={`Open source for ${selectedModel.name}`}>
                <ExternalLink size={16} />
              </a>
            </div>
            <div className="model-profile-grid">
              <div>
                <span>Strengths</span>
                <ul>{selectedModel.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div>
                <span>Avoid</span>
                <ul>{selectedModel.avoid.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div>
                <span>Best used for</span>
                <ul>{selectedModel.bestUsedFor.map((item) => <li key={item}>{item}</li>)}</ul>
              </div>
              <div>
                <span>Workflow position</span>
                <p><strong>Before:</strong> {selectedModel.before.join('; ')}</p>
                <p><strong>During:</strong> {selectedModel.during.join('; ')}</p>
                <p><strong>After:</strong> {selectedModel.after.join('; ')}</p>
              </div>
            </div>
            {selectedModel.officialClaims?.length ? (
              <div className="official-claims">
                <ShieldAlert size={16} aria-hidden="true" />
                <div>
                  <span>Official OpenAI facts · checked {selectedModel.verifiedOn}</span>
                  {selectedModel.officialClaims.map((claim) => <p key={claim}>{claim}</p>)}
                </div>
              </div>
            ) : null}
          </article>
        </div>
      </section>

      <section className="control-plane-diagram">
        <div>
          <span className="section-label">Hidden superpower</span>
          <h2>Copilot + Spark inside a governed loop</h2>
          <p>Neither tool replaces architecture, evidence review, or the owner’s publication decision.</p>
        </div>
        <div className="control-plane-flow" aria-label="Governed AI engineering control plane">
          {['Human', 'GenomeOps Atlas', 'GPT reasoning', 'Codex-Spark', 'GitHub Copilot', 'GitHub Actions', 'Vercel'].map((label, index) => (
            <div key={label} className="flow-item">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{label}</strong>
              {index < 6 ? <GitBranch size={15} aria-hidden="true" /> : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
