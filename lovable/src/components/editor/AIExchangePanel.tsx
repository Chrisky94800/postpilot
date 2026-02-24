// PostPilot — Zone d'échange IA dans l'éditeur de post

import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export interface ExchangeMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AIExchangePanelProps {
  messages: ExchangeMessage[]
  onSendRevision: (instruction: string) => Promise<void>
  loading?: boolean
}

export default function AIExchangePanel({
  messages,
  onSendRevision,
  loading,
}: AIExchangePanelProps) {
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    await onSendRevision(text)
  }

  if (messages.length === 0 && !loading) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[#0077B5]" />
        <p className="text-sm font-medium text-gray-900">Échange avec l'IA</p>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="space-y-3 max-h-64 overflow-y-auto pr-1"
      >
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-[#0077B5] text-white rounded-br-sm'
                  : 'bg-gray-100 text-gray-800 rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-xl rounded-bl-sm px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
          }}
          placeholder="Ex : Rends l'accroche plus percutante, ajoute une question…"
          disabled={loading}
          rows={2}
          className="resize-none text-sm"
        />
        <Button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          size="icon"
          className="shrink-0 h-auto bg-[#0077B5] hover:bg-[#005885]"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
