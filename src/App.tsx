import { useEffect, useState } from 'react'
import { AdvancedAtlas } from './advanced/AdvancedAtlas'
import { LanguageSwitch } from './components/LanguageSwitch'
import { routineCopy } from './data/routineCopy'
import { ROUTINE_LOCALE_KEY, type RoutineLocale } from './lib/routine'
import { RoutineGuide } from './views/RoutineGuide'

const initialLocale = (): RoutineLocale => {
  const saved = window.localStorage.getItem(ROUTINE_LOCALE_KEY)
  if (saved === 'en' || saved === 'ru') return saved
  return window.navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

const advancedFromHash = () => {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return params.get('mode') === 'advanced'
}

export default function App() {
  const [locale, setLocale] = useState<RoutineLocale>(initialLocale)
  const [advanced, setAdvanced] = useState(advancedFromHash)
  const copy = routineCopy[locale]

  useEffect(() => {
    window.localStorage.setItem(ROUTINE_LOCALE_KEY, locale)
    document.documentElement.lang = locale
  }, [locale])

  const openAdvanced = () => {
    setAdvanced(true)
    window.history.replaceState(null, '', '#mode=advanced&view=evidence')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const closeAdvanced = () => {
    setAdvanced(false)
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!advanced) {
    return <RoutineGuide locale={locale} onLocaleChange={setLocale} onAdvanced={openAdvanced} />
  }

  return (
    <div className="advanced-boundary">
      <div className="advanced-return-bar">
        <button type="button" onClick={closeAdvanced}>{copy.back}</button>
        <span>{copy.advancedNote}</span>
        <LanguageSwitch locale={locale} onChange={setLocale} label={copy.language} />
      </div>
      <AdvancedAtlas />
    </div>
  )
}
