// PostPilot — Mode source : Rédaction libre
// Composant simplifié : saisie uniquement. Le bouton "Lancer" est dans le parent.

import type React from 'react'
import { cn } from '@/lib/utils'

interface SourceFreeWritingProps {
  content: string
  onChange: (v: string) => void
  textareaRef?: React.RefObject<HTMLTextAreaElement>
}

export default function SourceFreeWriting({
  content,
  onChange,
  textareaRef,
}: SourceFreeWritingProps) {
  return (
    <textarea
      ref={textareaRef}
      value={content}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Notez vos idées en vrac : une anecdote, un chiffre, une opinion, un constat… Pas besoin d'être parfait, c'est le rôle de l'IA."
      rows={6}
      className={cn(
        'w-full rounded-md border border-input bg-background px-3 py-2',
        'text-sm placeholder:text-muted-foreground resize-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    />
  )
}
