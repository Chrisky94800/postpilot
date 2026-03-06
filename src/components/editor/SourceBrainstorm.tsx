// PostPilot — Mode source : Brainstorming IA
// L'utilisateur échange avec l'IA pour trouver un angle de post,
// puis l'IA rédige le post à partir de l'angle choisi.

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Loader2, ChevronRight, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { brainstormPost, type BrainstormTheme } from '@/lib/api'
import { useOrganization } from '@/hooks/useOrganization'

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatMessage = { role: 'user' | 'assistant'; content: string }

interface SourceBrainstormProps {
  /** Appelée quand l'utilisateur choisit un angle — PostEditorContent déclenche la génération */
  onThemeSelected: (themeContent: string) => Promise<void>
  /** True pendant la génération du post (après choix de l'angle) */
  loading: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Retire le bloc [THEMES]...[/THEMES] du texte affiché */
function cleanReply(content: string): string {
  return content.replace(/\[THEMES\][\s\S]*?\[\/THEMES\]/g, '').trim()
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function SourceBrainstorm({ onThemeSelected, loading }: SourceBrainstormProps) {
  const { organizationId } = useOrganization()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([])
  const [themes, setThemes] = useState<BrainstormTheme[] | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll au dernier message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, thinking])

  // ── Envoyer un message à l'IA ──────────────────────────────────────────────

  const sendMessage = async (text: string) => {
    if (!text.trim() || thinking || !organizationId) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setThinking(true)

    try {
      const res = await brainstormPost({
        organization_id: organizationId,
        message: text,
        conversation_history: conversationHistory,
      })

      const displayText = cleanReply(res.reply)
      if (displayText) {
        setMessages((prev) => [...prev, { role: 'assistant', content: displayText }])
      }

      if (res.themes && res.themes.length > 0) {
        setThemes(res.themes)
        setSelectedIdx(null)
      }

      setConversationHistory(res.conversation_history)
    } catch (err) {
      toast.error((err as Error).message ?? "Erreur de connexion à l'IA")
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: "Désolé, je n'ai pas pu répondre. Réessayez.",
      }])
    } finally {
      setThinking(false)
    }
  }

  const handleSend = () => {
    const text = input.trim()
    if (!text) return
    setInput('')
    sendMessage(text)
  }

  // ── Demander d'autres angles ───────────────────────────────────────────────

  const handleMoreThemes = () => {
    setThemes(null)
    setSelectedIdx(null)
    sendMessage("Propose-moi d'autres angles différents des précédents.")
  }

  // ── Choisir un angle → lancer la génération ────────────────────────────────

  const handleSelectTheme = async (theme: BrainstormTheme, idx: number) => {
    if (loading || thinking) return
    setSelectedIdx(idx)
    // On combine titre + angle comme source_content pour generate-post
    const sourceContent = `Sujet : ${theme.title}\n\nAngle : ${theme.angle}`
    try {
      await onThemeSelected(sourceContent)
    } catch {
      setSelectedIdx(null)
    }
  }

  const isEmpty = messages.length === 0

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Description initiale */}
      {isEmpty && (
        <p className="text-sm text-gray-500">
          Décrivez une idée, un sujet ou une actualité de votre secteur…
          L'IA vous proposera plusieurs angles de post LinkedIn.
        </p>
      )}

      {/* Historique du chat */}
      {!isEmpty && (
        <div
          ref={scrollRef}
          className="space-y-3 max-h-52 overflow-y-auto pr-1"
        >
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[88%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#0077B5] text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Indicateur de réflexion */}
          {thinking && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-xl rounded-bl-sm px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input utilisateur */}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder={
            isEmpty
              ? "Ex : notre migration vers le cloud, les tendances IA en 2025, un retour d'expérience projet…"
              : "Précisez, posez une question…"
          }
          disabled={thinking}
          rows={isEmpty ? 3 : 2}
          className="resize-none text-sm"
        />
        <Button
          onClick={handleSend}
          disabled={thinking || !input.trim()}
          size="icon"
          className="shrink-0 h-auto bg-[#0077B5] hover:bg-[#005885]"
        >
          {thinking
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Send className="h-4 w-4" />
          }
        </Button>
      </div>

      {/* Angles proposés par l'IA */}
      {themes && themes.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#0077B5]" />
            <p className="text-sm font-medium text-gray-800">Choisissez un angle</p>
          </div>

          <div className="space-y-2">
            {themes.map((theme, i) => {
              const isSelected = selectedIdx === i
              return (
                <button
                  key={i}
                  onClick={() => handleSelectTheme(theme, i)}
                  disabled={loading || thinking}
                  className={`w-full text-left p-3 rounded-xl border transition-all group disabled:opacity-60 ${
                    isSelected
                      ? 'border-[#0077B5] bg-blue-50'
                      : 'border-gray-200 hover:border-[#0077B5] hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isSelected ? 'text-[#0077B5]' : 'text-gray-900 group-hover:text-[#0077B5]'}`}>
                        {theme.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                        {theme.angle}
                      </p>
                    </div>
                    <div className="shrink-0 mt-0.5">
                      {isSelected && loading
                        ? <Loader2 className="h-4 w-4 animate-spin text-[#0077B5]" />
                        : <ChevronRight className={`h-4 w-4 ${isSelected ? 'text-[#0077B5]' : 'text-gray-300 group-hover:text-[#0077B5]'}`} />
                      }
                    </div>
                  </div>
                  {isSelected && loading && (
                    <p className="text-xs text-[#0077B5] mt-1.5 animate-pulse">
                      Rédaction du post en cours…
                    </p>
                  )}
                </button>
              )
            })}
          </div>

          {/* Demander d'autres angles */}
          <button
            onClick={handleMoreThemes}
            disabled={thinking || loading}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#0077B5] transition-colors disabled:opacity-40 mt-1"
          >
            <RefreshCw className="h-3 w-3" />
            Proposer d'autres angles
          </button>
        </div>
      )}
    </div>
  )
}
