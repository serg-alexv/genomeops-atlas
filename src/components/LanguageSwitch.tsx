import type { RoutineLocale } from '../lib/routine'

interface LanguageSwitchProps {
  locale: RoutineLocale
  onChange: (locale: RoutineLocale) => void
  label: string
}

export function LanguageSwitch({ locale, onChange, label }: LanguageSwitchProps) {
  return (
    <div className="language-switch" role="group" aria-label={label}>
      <button
        type="button"
        className={locale === 'en' ? 'is-active' : ''}
        aria-pressed={locale === 'en'}
        onClick={() => onChange('en')}
      >
        EN
      </button>
      <span aria-hidden="true">/</span>
      <button
        type="button"
        className={locale === 'ru' ? 'is-active' : ''}
        aria-pressed={locale === 'ru'}
        onClick={() => onChange('ru')}
      >
        RU
      </button>
    </div>
  )
}
