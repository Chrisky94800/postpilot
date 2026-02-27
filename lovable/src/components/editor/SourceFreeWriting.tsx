// PostPilot — Mode source : Rédaction libre

import type React from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { LINKEDIN_POST_MAX_LENGTH } from '@/lib/constants'

interface SourceFreeWritingProps {
  content: string
  onChange: (v: string) => void
  onSubmitToAI: () => void
  loading?: boolean
  textareaRef?: React.RefObject<HTMLTextAreaElement>
}

export default function SourceFreeWriting({
  content,
  onChange,
  onSubmitToAI,
  loading,
  textareaRef,
}: SourceFreeWritingProps) {
  const charCount = content.length
  const isOver = charCount > LINKEDIN_POST_MAX_LENGTH

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Rédigez votre post, puis demandez à l'IA de l'optimiser.
        </p>
        <span className={cn('text-xs', isOver ? 'text-red-500 font-medium' : 'text-gray-400')}>
          {charCount} / {LINKEDIN_POST_MAX_LENGTH}
        </span>
      </div>
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Commencez à écrire votre post LinkedIn ici…"
        rows={8}
        className={cn('font-mono text-sm resize-none', isOver && 'border-red-300')}
      />
      <Button
        onClick={onSubmitToAI}
        disabled={loading || !content.trim()}
        variant="outline"
        className="border-[#0077B5] text-[#0077B5] hover:bg-blue-50"
        size="sm"
      >
        <Sparkles className="h-4 w-4 mr-2" />
        {loading ? 'Optimisation en cours…' : "Soumettre à l'IA pour optimisation"}
      </Button>
    </div>
  )
}
