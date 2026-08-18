import {
  BookOpenText,
  BrainCircuit,
  Compass,
  Download,
  FolderKanban,
  MessageSquareText,
  Network,
} from 'lucide-react'
import { BrandMark } from './BrandMark'
import type { ViewId } from '../types'

const navItems: Array<{
  id: ViewId
  label: string
  icon: typeof FolderKanban
}> = [
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'prompt', label: 'Prompt Studio', icon: MessageSquareText },
  { id: 'evidence', label: 'Evidence Map', icon: Network },
  { id: 'tools', label: 'Tool Advisor', icon: Compass },
  { id: 'workforce', label: 'AI Workforce', icon: BrainCircuit },
  { id: 'memory', label: 'Research Memory', icon: BookOpenText },
]

interface AppHeaderProps {
  view: ViewId
  onViewChange: (view: ViewId) => void
  onExport: () => void
}

export function AppHeader({ view, onViewChange, onExport }: AppHeaderProps) {
  return (
    <header className="app-header">
      <button className="brand-lockup" onClick={() => onViewChange('evidence')} aria-label="Open GenomeOps Atlas evidence map">
        <BrandMark />
        <span>
          <strong>GenomeOps</strong>
          <span>Atlas</span>
        </span>
      </button>

      <nav className="desktop-nav" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              className={view === item.id ? 'nav-item is-active' : 'nav-item'}
              onClick={() => onViewChange(item.id)}
              aria-current={view === item.id ? 'page' : undefined}
            >
              <Icon size={15} strokeWidth={1.7} aria-hidden="true" />
              {item.label}
            </button>
          )
        })}
      </nav>

      <label className="mobile-nav-label">
        <span className="sr-only">Current section</span>
        <select value={view} onChange={(event) => onViewChange(event.target.value as ViewId)}>
          {navItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <button className="export-button" onClick={onExport}>
        <Download size={15} aria-hidden="true" />
        <span>Export brief</span>
      </button>
    </header>
  )
}
