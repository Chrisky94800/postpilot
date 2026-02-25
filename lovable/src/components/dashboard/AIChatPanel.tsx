// PostPilot — Panel de chat IA conversationnel (Dashboard)

import { useState, useRef, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Bot } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import AIChatMessage from './AIChatMessage'
import AIChatInput from './AIChatInput'
import ProgramExtractCard from './ProgramExtractCard'
import { aiChat, createProgram } from '@/lib/api'
import type { AiMessage, ExtractedItem } from '@/types/database'

const WELCOME_MESSAGE: AiMessage = {
  role: 'assistant',
  content:
    'Bonjour ! Je suis votre assistant de communication.\n\nJe peux vous aider à :\n• Créer un programme de communication\n• Préparer vos prochains posts\n• Analyser vos performances LinkedIn\n\nComment puis-je vous aider aujourd\'hui ?',
  timestamp: new Date().toISOString(),
}

interface AIChatPanelProps {
  organizationId: string
}

export default function AIChatPanel({ organizationId }: AIChatPanelProps) {
  const queryClient = useQueryClient()
  const scrollRef = useRef<HTMLDivElement>(null)

  const [messages, setMessages] = useState<AiMessage[]>([WELCOME_MESSAGE])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([])
  const [loading, setLoading] = useState(false)

  // Auto-scroll au dernier message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, extractedItems, loading])

  const handleSend = async (text: string) => {
    const userMsg: AiMessage = { role: 'user', content: text, timestamp: new Date().toISOString() }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await aiChat({
        organization_id: organizationId,
        conversation_id: conversationId,
        message: text,
      })

      const assistantMsg: AiMessage = {
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])
      setConversationId(res.conversation_id)

      if (res.extracted_items?.length > 0) {
        setExtractedItems(res.extracted_items.map(item => ({ ...item, validated: false })))
      }
    } catch {
      const errMsg: AiMessage = {
        role: 'assistant',
        content: "Désolé, je rencontre une difficulté technique. Veuillez réessayer dans quelques instants.",
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleProgramValidated = () => {
    setExtractedItems([])
    toast.success('Programme créé avec succès ! Les posts sont visibles dans le calendrier.')
    queryClient.invalidateQueries({ queryKey: ['programs', organizationId] })
    queryClient.invalidateQueries({ queryKey: ['posts', organizationId] })

    const confirmMsg: AiMessage = {
      role: 'assistant',
      content: 'Programme créé avec succès ! Les posts ont été ajoutés à votre calendrier en statut "En attente". Vous pouvez maintenant commencer à les rédiger depuis la page Programmes ou le Calendrier.',
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, confirmMsg])
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 pb-3 border-b mb-3">
        <div className="h-7 w-7 bg-[#0077B5] rounded-lg flex items-center justify-center shrink-0">
          <Bot className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Assistant de communication</p>
          <p className="text-xs text-gray-400">Propulsé par Claude</p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0"
        style={{ maxHeight: '380px' }}
      >
        {messages.map((msg, i) => (
          <AIChatMessage key={i} message={msg} />
        ))}

        {/* Programme proposé par l'IA */}
        {extractedItems.map((item, i) => (
          <ProgramExtractCard
            key={i}
            item={item}
            organizationId={organizationId}
            onValidated={handleProgramValidated}
            onCreateProgram={createProgram}
          />
        ))}

        {/* Indicateur de chargement */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                <Skeleton className="h-2 w-2 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <Skeleton className="h-2 w-2 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <Skeleton className="h-2 w-2 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="pt-3 border-t mt-3">
        <AIChatInput onSend={handleSend} disabled={loading} />
      </div>
    </div>
  )
}
