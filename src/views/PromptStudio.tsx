import { useMemo, useState } from 'react'
import { Check, Copy, Download, Search, Sparkles } from 'lucide-react'
import { promptRecipes } from '../data/recipes'
import {
  buildAdvisoryPrompt,
  promptTemplates,
  type PromptBuilderInput,
  type PromptTemplateId,
} from '../lib/promptBuilder'
import { downloadText } from '../lib/export'
import type { GenomeProject } from '../types'

export function PromptStudio({ project }: { project: GenomeProject }) {
  const [form, setForm] = useState<PromptBuilderInput>({
    template: 'annotation-review',
    organism: project.organism,
    goal: 'Build a source-linked evidence map and decide what must be checked next.',
    availableData: 'Project notes and demo evidence-state records; no raw sequence or experimental result is attached.',
    question: project.question,
    confidenceThreshold: 'source-linked',
  })
  const [generated, setGenerated] = useState(() => buildAdvisoryPrompt(form))
  const [recipeQuery, setRecipeQuery] = useState('')
  const [selectedRecipeId, setSelectedRecipeId] = useState(promptRecipes[0].id)
  const [copied, setCopied] = useState(false)

  const selectedRecipe = promptRecipes.find((recipe) => recipe.id === selectedRecipeId) ?? promptRecipes[0]
  const filteredRecipes = useMemo(() => {
    const query = recipeQuery.trim().toLowerCase()
    if (!query) return promptRecipes
    return promptRecipes.filter((recipe) =>
      `${recipe.title} ${recipe.description} ${recipe.group}`.toLowerCase().includes(query),
    )
  }, [recipeQuery])

  const update = <Key extends keyof PromptBuilderInput>(key: Key, value: PromptBuilderInput[Key]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(generated)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="content-view prompt-view">
      <header className="view-intro split-intro">
        <div>
          <span className="section-label">Prompt Studio</span>
          <h1>Build the evidence contract<br />before asking for an answer.</h1>
        </div>
        <p>
          These prompts force a clean separation between observation, prediction, missing evidence, and human decision.
          Generation is deterministic and runs entirely in your browser.
        </p>
      </header>

      <div className="prompt-layout">
        <section className="prompt-builder-panel">
          <div className="panel-heading-row">
            <div>
              <span className="section-label">Builder</span>
              <h2>Advisory prompt</h2>
            </div>
            <span className="local-only-mark">No model call</span>
          </div>

          <div className="template-selector" aria-label="Prompt template">
            {promptTemplates.map((template) => (
              <button
                key={template.id}
                className={form.template === template.id ? 'template-option is-active' : 'template-option'}
                onClick={() => update('template', template.id as PromptTemplateId)}
                aria-pressed={form.template === template.id}
              >
                <strong>{template.name}</strong>
                <span>{template.description}</span>
              </button>
            ))}
          </div>

          <div className="prompt-fields">
            <label>
              <span>Organism or scope</span>
              <input value={form.organism} onChange={(event) => update('organism', event.target.value)} />
            </label>
            <label>
              <span>Goal</span>
              <textarea rows={2} value={form.goal} onChange={(event) => update('goal', event.target.value)} />
            </label>
            <label>
              <span>Available data</span>
              <textarea rows={3} value={form.availableData} onChange={(event) => update('availableData', event.target.value)} />
            </label>
            <label>
              <span>Question</span>
              <textarea rows={3} value={form.question} onChange={(event) => update('question', event.target.value)} />
            </label>
            <label>
              <span>Confidence threshold</span>
              <select
                value={form.confidenceThreshold}
                onChange={(event) => update('confidenceThreshold', event.target.value as PromptBuilderInput['confidenceThreshold'])}
              >
                <option value="exploratory">Exploratory</option>
                <option value="source-linked">Source-linked</option>
                <option value="decision-ready">Decision-ready</option>
              </select>
            </label>
          </div>

          <button className="primary-action wide-action" onClick={() => setGenerated(buildAdvisoryPrompt(form))}>
            <Sparkles size={16} aria-hidden="true" />
            Generate prompt
          </button>
        </section>

        <section className="prompt-output-panel">
          <div className="panel-heading-row">
            <div>
              <span className="section-label">Generated contract</span>
              <h2>Ready to hand off</h2>
            </div>
            <div className="output-actions">
              <button onClick={copyPrompt} aria-label="Copy generated prompt">
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button onClick={() => downloadText('genomeops-advisory-prompt.md', generated, 'text/markdown')} aria-label="Download generated prompt">
                <Download size={15} />
                Download
              </button>
            </div>
          </div>
          <pre className="prompt-output" tabIndex={0}>{generated}</pre>
        </section>
      </div>

      <section className="recipe-database">
        <div className="recipe-index">
          <div className="recipe-index-header">
            <div>
              <span className="section-label">Prompt recipes database</span>
              <h2>Reusable handoff patterns</h2>
            </div>
            <label className="recipe-search">
              <Search size={14} aria-hidden="true" />
              <span className="sr-only">Search prompt recipes</span>
              <input value={recipeQuery} onChange={(event) => setRecipeQuery(event.target.value)} placeholder="Search recipes" />
            </label>
          </div>
          <div className="recipe-list">
            {filteredRecipes.map((recipe) => (
              <button
                key={recipe.id}
                className={recipe.id === selectedRecipe.id ? 'recipe-list-item is-active' : 'recipe-list-item'}
                onClick={() => setSelectedRecipeId(recipe.id)}
              >
                <span>{recipe.group}</span>
                <strong>{recipe.title}</strong>
                <small>{recipe.description}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="recipe-preview">
          <pre>{selectedRecipe.body}</pre>
          <button className="secondary-action" onClick={() => setGenerated(selectedRecipe.body)}>
            Use in output
          </button>
        </div>
      </section>
    </div>
  )
}
