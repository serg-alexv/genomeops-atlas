import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, Pause, Play, X } from 'lucide-react'
import { LanguageSwitch } from '../components/LanguageSwitch'
import { routineCopy } from '../data/routineCopy'
import {
  buildRoutineResult,
  loadRoutineAims,
  saveRoutineAims,
  type RoutineChoice,
  type RoutineIntent,
  type RoutineLocale,
  type StoredAim,
} from '../lib/routine'

interface RoutineGuideProps {
  locale: RoutineLocale
  onLocaleChange: (locale: RoutineLocale) => void
  onAdvanced: () => void
}

const quickIntents: RoutineIntent[] = ['doubt', 'compare', 'plan', 'better_ai']
const makeAimId = () => `aim-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

export function RoutineGuide({ locale, onLocaleChange, onAdvanced }: RoutineGuideProps) {
  const copy = routineCopy[locale]
  const [input, setInput] = useState('')
  const [preferredIntent, setPreferredIntent] = useState<RoutineIntent | undefined>()
  const [source, setSource] = useState<string>(copy.sample)
  const [sourceIntent, setSourceIntent] = useState<RoutineIntent>('plan')
  const [isDemo, setIsDemo] = useState(true)
  const [aims, setAims] = useState<StoredAim[]>(loadRoutineAims)
  const [aimsOpen, setAimsOpen] = useState(false)
  const [error, setError] = useState('')
  const [choice, setChoice] = useState<RoutineChoice>('b')
  const [testActive, setTestActive] = useState(false)
  const [timerRunning, setTimerRunning] = useState(false)
  const [remainingSeconds, setRemainingSeconds] = useState(600)
  const [checkedSteps, setCheckedSteps] = useState<number[]>([])
  const [testFinished, setTestFinished] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const responseRef = useRef<HTMLElement>(null)

  const { result } = useMemo(
    () => buildRoutineResult(source, locale, sourceIntent),
    [locale, source, sourceIntent],
  )

  useEffect(() => saveRoutineAims(aims), [aims])

  useEffect(() => {
    if (isDemo) setSource(copy.sample)
  }, [copy.sample, isDemo])

  useEffect(() => {
    if (!timerRunning || remainingSeconds <= 0) return
    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [remainingSeconds, timerRunning])

  useEffect(() => {
    if (remainingSeconds === 0) setTimerRunning(false)
  }, [remainingSeconds])

  const resetTest = (nextChoice: RoutineChoice = 'b') => {
    setChoice(nextChoice)
    setTestActive(false)
    setTimerRunning(false)
    setRemainingSeconds(600)
    setCheckedSteps([])
    setTestFinished(false)
  }

  const saveAim = (nextSource: string, intent: RoutineIntent) => {
    setAims((current) => {
      const existing = current.find((aim) => aim.input === nextSource)
      if (existing) {
        return [{ ...existing, intent, createdAt: new Date().toISOString() }, ...current.filter((aim) => aim.id !== existing.id)]
      }
      return [{ id: makeAimId(), input: nextSource, intent, createdAt: new Date().toISOString(), completed: false }, ...current]
    })
  }

  const submit = () => {
    const nextSource = input.trim()
    if (!nextSource) {
      setError(copy.emptyError)
      inputRef.current?.focus()
      return
    }
    const next = buildRoutineResult(nextSource, locale, preferredIntent)
    setSource(nextSource)
    setSourceIntent(next.intent)
    setIsDemo(false)
    setError('')
    saveAim(nextSource, next.intent)
    resetTest(next.result.recommended)
    window.requestAnimationFrame(() => responseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const chooseQuickStart = (intent: RoutineIntent) => {
    setPreferredIntent(intent)
    setInput(copy.seeds[intent])
    setError('')
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }

  const reopenAim = (aim: StoredAim) => {
    setInput(aim.input)
    setPreferredIntent(aim.intent)
    setSource(aim.input)
    setSourceIntent(aim.intent)
    setIsDemo(false)
    resetTest(aim.choice ?? 'b')
    setTestFinished(aim.completed)
    setAimsOpen(false)
    window.requestAnimationFrame(() => responseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const startTest = () => {
    if (isDemo) saveAim(source, sourceIntent)
    setTestActive(true)
    setTimerRunning(true)
    setTestFinished(false)
    window.requestAnimationFrame(() => document.querySelector('.routine-test-runner')?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  const finishTest = () => {
    setTimerRunning(false)
    setTestFinished(true)
    setAims((current) => current.map((aim) => (
      aim.input === source ? { ...aim, completed: true, choice } : aim
    )))
  }

  const formattedTime = `${String(Math.floor(remainingSeconds / 60)).padStart(2, '0')}:${String(remainingSeconds % 60).padStart(2, '0')}`

  return (
    <div className="routine-root">
      <header className="routine-header">
        <button className="routine-brand" type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <strong>GenomeOps</strong> <span>Atlas</span>
        </button>
        <div className="routine-header-actions">
          <button className="aims-button" type="button" onClick={() => setAimsOpen(true)}>{copy.myAims}</button>
          <LanguageSwitch locale={locale} onChange={onLocaleChange} label={copy.language} />
        </div>
      </header>

      <main>
        <section className="routine-intro" aria-labelledby="routine-heading">
          <h1 id="routine-heading">{copy.heading}</h1>
          <p>{copy.intro}</p>

          <div className="routine-composer">
            <label className="sr-only" htmlFor="routine-input">{copy.heading}</label>
            <textarea
              id="routine-input"
              ref={inputRef}
              value={input}
              onChange={(event) => {
                setInput(event.target.value)
                setPreferredIntent(undefined)
                setError('')
              }}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') submit()
              }}
              placeholder={copy.placeholder}
              rows={4}
            />
            {error ? <p className="routine-error" role="alert">{error}</p> : null}
            <button className="routine-primary" type="button" onClick={submit}>
              <span>{copy.guide}</span><ArrowRight size={21} aria-hidden="true" />
            </button>
          </div>

          <div className="quick-starts" aria-label={copy.guide}>
            {quickIntents.map((intent) => (
              <button
                type="button"
                key={intent}
                className={preferredIntent === intent ? 'is-active' : ''}
                onClick={() => chooseQuickStart(intent)}
              >
                {copy.quick[intent]}
              </button>
            ))}
          </div>
        </section>

        <section className="routine-response" ref={responseRef} aria-live="polite" aria-label={copy.youSaid}>
          <div className="routine-source">
            <span>{copy.youSaid}</span>
            <p>{source}</p>
          </div>

          <div className="routine-answer-grid">
            <article><h2>{copy.startHere}</h2><p>{result.startHere}</p></article>
            <article><h2>{copy.aiTakeover}</h2><p>{result.aiTakeover}</p></article>
            <article><h2>{copy.keepHuman}</h2><p>{result.keepHuman}</p></article>
            <article><h2>{copy.tryTest}</h2><p>{result.testIntro}</p></article>
          </div>

          <div className="routine-options" role="radiogroup" aria-label={copy.tryTest}>
            {(['a', 'b'] as const).map((optionKey) => {
              const option = optionKey === 'a' ? result.optionA : result.optionB
              return (
                <button
                  type="button"
                  key={optionKey}
                  role="radio"
                  aria-checked={choice === optionKey}
                  className={choice === optionKey ? 'routine-option is-selected' : 'routine-option'}
                  onClick={() => setChoice(optionKey)}
                >
                  <span>{optionKey.toUpperCase()}</span>
                  <span><strong>{option.title}</strong><small>{option.detail}</small></span>
                  {optionKey === result.recommended ? <em>{copy.recommended}</em> : null}
                </button>
              )
            })}
          </div>

          <button className="routine-start-test" type="button" onClick={startTest}>
            {copy.startTest}<ArrowRight size={20} aria-hidden="true" />
          </button>

          {testActive ? (
            <div className="routine-test-runner" aria-live="polite">
              <div className="test-runner-heading">
                <div><h3>{copy.timerTitle}</h3><p>{copy.timerIntro}</p></div>
                <time>{formattedTime}</time>
              </div>
              <div className="timer-track" aria-hidden="true"><span style={{ width: `${(remainingSeconds / 600) * 100}%` }} /></div>
              <div className="test-steps">
                {result.steps.map((step, index) => {
                  const checked = checkedSteps.includes(index)
                  return (
                    <label key={step}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setCheckedSteps((current) => (
                          checked ? current.filter((item) => item !== index) : [...current, index]
                        ))}
                      />
                      <span>{checked ? <Check size={15} aria-hidden="true" /> : String(index + 1)}</span>
                      {step}
                    </label>
                  )
                })}
              </div>
              <div className="test-controls">
                <button type="button" onClick={() => setTimerRunning((current) => !current)}>
                  {timerRunning ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
                  {timerRunning ? copy.pause : copy.resume}
                </button>
                <button type="button" className="finish-test" onClick={finishTest}>{copy.finish}</button>
              </div>
              {testFinished ? <p className="test-finished"><Check size={16} aria-hidden="true" />{copy.finished}</p> : null}
            </div>
          ) : null}

          <button className="advanced-link" type="button" onClick={onAdvanced}>{copy.advanced}</button>
        </section>

        <section className="routine-how" aria-labelledby="routine-how-title">
          <h2 id="routine-how-title">{copy.howTitle}</h2>
          <div>
            {copy.how.map(([title, detail], index) => (
              <article key={title}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{title}</h3>
                <p>{detail}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="routine-footer"><span>GenomeOps Atlas / v0.2</span><span>{copy.localNote}</span></footer>

      {aimsOpen ? (
        <div className="aims-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setAimsOpen(false)
        }}>
          <aside className="aims-drawer" role="dialog" aria-modal="true" aria-labelledby="aims-title">
            <div className="aims-drawer-header">
              <div><h2 id="aims-title">{copy.aimsTitle}</h2><p>{copy.aimsIntro}</p></div>
              <button type="button" aria-label={copy.close} onClick={() => setAimsOpen(false)}><X size={20} /></button>
            </div>
            {aims.length ? (
              <div className="aims-list">
                {aims.map((aim) => (
                  <button type="button" key={aim.id} onClick={() => reopenAim(aim)}>
                    <span>{aim.input}</span>
                    <small>{new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-US', { month: 'short', day: 'numeric' }).format(new Date(aim.createdAt))}{aim.completed ? ` · ${copy.completed}` : ''}</small>
                    <em>{copy.reopen}<ArrowRight size={14} aria-hidden="true" /></em>
                  </button>
                ))}
              </div>
            ) : <p className="aims-empty">{copy.aimsEmpty}</p>}
          </aside>
        </div>
      ) : null}
    </div>
  )
}
