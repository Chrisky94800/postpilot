// PostPilot — Input du chat IA avec suggestions rapides

import { useState, useRef } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const SUGGESTIONS = [
  'Créer un programme de communication',
  'Préparer un post pour la semaine prochaine',
  'Comment améliorer mon engagement ?',
]

interface AIChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export default function AIChatInput({ onSend, disabled }: AIChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="space-y-2">
      {/* Suggestions rapides */}
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => { setValue(s); textareaRef.current?.focus() }}
            className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700 transition-colors disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Zone de saisie */}
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Votre message… (Entrée pour envoyer)"
          disabled={disabled}
          rows={2}
          className="resize-none text-sm"
        />
        <Button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          size="icon"
          className="shrink-0 h-auto bg-[#0077B5] hover:bg-[#005885]"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
