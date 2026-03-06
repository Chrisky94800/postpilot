// PostPilot — Mode source : URL / Article
// Composant simplifié : saisie uniquement. Le scraping et la génération sont dans le parent.

import { Link } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface SourceURLProps {
  url: string
  onChange: (v: string) => void
  onEnterKey?: () => void
}

export default function SourceURL({ url, onChange, onEnterKey }: SourceURLProps) {
  return (
    <div className="relative">
      <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      <Input
        type="url"
        value={url}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && onEnterKey?.()}
        placeholder="https://example.com/article-interessant"
        className="pl-9"
      />
    </div>
  )
}
