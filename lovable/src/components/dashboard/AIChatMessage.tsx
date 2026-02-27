// PostPilot — Bulle de message du chat IA

import type { AiMessage } from '@/types/database'

/** Retire le bloc [PROGRAM_PROPOSAL]...[/PROGRAM_PROPOSAL] du texte affiché */
function cleanContent(content: string): string {
  return content
    .replace(/\[PROGRAM_PROPOSAL\][\s\S]*?\[\/PROGRAM_PROPOSAL\]/g, '')
    .trim()
}

export default function AIChatMessage({ message }: { message: AiMessage }) {
  const isUser = message.role === 'user'
  const displayText = isUser ? message.content : cleanContent(message.content)

  // Si le message ne contenait que le bloc JSON (rien d'autre), on n'affiche pas de bulle vide
  if (!displayText) return null

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-[#0077B5] text-white rounded-br-sm'
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
        }`}
      >
        {displayText}
      </div>
    </div>
  )
}
