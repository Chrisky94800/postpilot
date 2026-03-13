// PostPilot — Chat Drawer (panneau latéral glissant)
// S'ouvre depuis la droite, 420px, persiste pendant la session.

import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import AIChatMessage from './AIChatMessage'
import AIChatInput from './AIChatInput'
import ProgramExtractCard from './ProgramExtractCard'
import IdeaExtractCard from './IdeaExtractCard'
import { aiChat, createProgram } from '@/lib/api'
import type { AiMessage, ExtractedItem } from '@/types/database'

const SUGGESTIONS = [
  'Créer un programme de 4 semaines',
  'Donne-moi des idées de posts',
  'Programme de 2 semaines',
]

interface ChatDrawerProps {
  isOpen: boolean
  onClose: () => void
  organizationId: string
  /** Prénom de l'utilisateur pour le message de bienvenue */
  userName?: string
  /** Nombre de posts à rédiger cette semaine (KPI 2) */
  toWriteThisWeek: number
  /** Si défini, envoie ce message dans le chat à l'ouverture */
  initialMessage?: string | null
}

export default function ChatDrawer({
  isOpen,
  onClose,
  organizationId,
  userName,
  toWriteThisWeek,
  initialMessage,
}: ChatDrawerProps) {
  const queryClient = useQueryClient()
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastInitialRef = useRef<string | null>(null)

  // Message de bienvenue personnalisé
  const prenom = userName?.split(' ')[0] ?? 'vous'
  const welcomeText =
    toWriteThisWeek > 0
      ? `Bonjour ${prenom} ! Vous avez ${toWriteThisWeek} post${toWriteThisWeek > 1 ? 's' : ''} à rédiger cette semaine. On s'y met ?`
      : `Bonjour ${prenom} ! Je suis votre assistant de communication LinkedIn. Comment puis-je vous aider aujourd'hui ?`

  const welcomeMessage: AiMessage = {
    role: 'assistant',
    content: welcomeText,
    timestamp: new Date().toISOString(),
  }

  const [messages, setMessages] = useState<AiMessage[]>([welcomeMessage])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [conversationHistory, setConversationHistory] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([])
  const [extractedItems, setExtractedItems] = useState<ExtractedItem[]>([])
  const [ideaItems, setIdeaItems] = useState<{ title: string; description: string }[]>([])
  const [loading, setLoading] = useState(false)

  // Suggestions visibles uniquement au premier message (tant qu'aucun message user n'a été envoyé)
  const hasUserMessage = messages.some((m) => m.role === 'user')

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, extractedItems, loading])

  // Envoyer le initialMessage une seule fois quand le drawer s'ouvre
  useEffect(() => {
    if (isOpen && initialMessage && initialMessage !== lastInitialRef.current) {
      lastInitialRef.current = initialMessage
      // Léger délai pour laisser le drawer s'animer
      const t = setTimeout(() => handleSend(initialMessage), 300)
      return () => clearTimeout(t)
    }
  }, [isOpen, initialMessage]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = async (text: string) => {
    const userMsg: AiMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await aiChat({
        organization_id: organizationId,
        conversation_id: conversationId,
        message: text,
        conversation_history: conversationHistory,
      })

      const assistantMsg: AiMessage = {
        role: 'assistant',
        content: res.reply,
        timestamp: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])
      setConversationId(res.conversation_id)

      if (res.conversation_history) {
        setConversationHistory(res.conversation_history)
      }

      if (res.extracted_items?.length > 0) {
        const programItems = res.extracted_items.filter(item => item.type === 'program')
        const ideaItems = res.extracted_items.filter(item => item.type === 'idea')
        if (programItems.length > 0) {
          setExtractedItems(
            programItems.map((item) => ({ ...item, validated: false })),
          )
        }
        if (ideaItems.length > 0) {
          setIdeaItems(ideaItems.map(item => item.data as { title: string; description: string }))
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Désolé, je rencontre une difficulté technique. Veuillez réessayer dans quelques instants.',
          timestamp: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleSuggestionClick = (s: string) => {
    handleSend(s)
  }

  const handleProgramValidated = () => {
    setExtractedItems([])
    setIdeaItems([])
    setConversationHistory([])
    setConversationId(null)
    toast.success('Programme créé ! Les posts sont visibles dans la page Programmes.')
    queryClient.invalidateQueries({ queryKey: ['programs', organizationId] })
    queryClient.invalidateQueries({ queryKey: ['posts', organizationId] })
    queryClient.invalidateQueries({ queryKey: ['dashboard_kpis', organizationId] })

    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content:
          'Programme créé ! Les posts sont maintenant dans votre calendrier en statut "À rédiger".\n\nRendez-vous dans la page Programmes pour rédiger chaque post.',
        timestamp: new Date().toISOString(),
      },
    ])
  }

  return (
    <>
      {/* Overlay semi-transparent */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[99] bg-black/10"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 bottom-0 z-[100]
          w-[420px] max-w-[100vw]
          bg-white border-l border-gray-200
          shadow-[-4px_0_24px_rgba(0,0,0,0.06)]
          flex flex-col
          transition-transform duration-250 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div>
            <p className="text-[15px] font-bold text-gray-900">Assistant PostPilot</p>
            <p className="text-[12px] text-gray-400">Votre copilote LinkedIn</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-[20px] leading-none"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Zone messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 min-h-0"
        >
          {messages.map((msg, i) => (
            <AIChatMessage key={i} message={msg} />
          ))}

          {/* Programmes proposés par l'IA */}
          {extractedItems.map((item, i) => (
            <ProgramExtractCard
              key={i}
              item={item}
              organizationId={organizationId}
              onValidated={handleProgramValidated}
              onCreateProgram={createProgram}
            />
          ))}

          {/* Idées proposées par l'IA */}
          {ideaItems.map((idea, i) => (
            <IdeaExtractCard
              key={i}
              idea={idea}
              organizationId={organizationId}
            />
          ))}

          {/* Indicateur de chargement */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1 items-center">
                  <span
                    className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <span
                    className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Suggestions (visibles uniquement avant le premier message user) */}
        {!hasUserMessage && !loading && (
          <div className="px-5 pb-2 flex flex-wrap gap-1.5 shrink-0">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestionClick(s)}
                className="px-3 py-1.5 rounded-full border border-gray-200 bg-white
                           text-[12px] text-gray-700 hover:border-[#2563EB] hover:text-[#2563EB]
                           transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Zone de saisie */}
        <div className="px-5 py-3.5 border-t border-gray-200 shrink-0">
          <AIChatInput onSend={handleSend} disabled={loading} />
        </div>
      </div>
    </>
  )
}
