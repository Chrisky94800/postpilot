// PostPilot — TagInput : champ de saisie de tags réutilisable

import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Props {
  tags: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  maxTags?: number
  /** Préfixe affiché dans le badge (ex: "#" pour les hashtags) */
  prefix?: string
  /** Transformer le tag avant ajout (ex: mettre en minuscules) */
  transform?: (value: string) => string
  className?: string
}

export function TagInput({
  tags,
  onChange,
  placeholder = 'Tapez et appuyez sur Entrée…',
  maxTags = 20,
  prefix = '',
  transform,
  className,
}: Props) {
  const [input, setInput] = useState('')

  const addTag = (raw: string) => {
    let value = raw.trim()
    if (!value) return
    if (transform) value = transform(value)
    // Supprimer un préfixe saisi manuellement (ex: "# react" → "react")
    if (prefix && value.startsWith(prefix)) value = value.slice(prefix.length).trim()
    if (!value) return
    if (tags.includes(value)) { setInput(''); return }
    if (tags.length >= maxTags) return
    onChange([...tags, value])
    setInput('')
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  const isMaxed = tags.length >= maxTags

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-1.5 min-h-[2.25rem] p-2 border rounded-md bg-background">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="flex items-center gap-1 pr-1 text-xs"
          >
            {prefix}{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-0.5 rounded-full hover:bg-gray-300 p-0.5 transition-colors"
              aria-label={`Supprimer ${tag}`}
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}
        {!isMaxed && (
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => addTag(input)}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
        )}
      </div>
      <p className="text-xs text-gray-400">
        {isMaxed
          ? `Maximum ${maxTags} tags atteint`
          : 'Appuyez sur Entrée ou virgule pour valider'}
      </p>
    </div>
  )
}
