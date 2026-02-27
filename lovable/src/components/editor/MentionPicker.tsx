// PostPilot — Sélecteur de mentions LinkedIn
// Permet d'insérer @[Nom] dans le contenu du post à partir des contacts enregistrés.

import { useState, useRef } from 'react'
import { AtSign, Search, User, Building2, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useContacts } from '@/hooks/useContacts'
import type { Contact } from '@/types/database'

// ─── Format mention ───────────────────────────────────────────────────────────

export function formatMention(contact: Contact): string {
  return `@[${contact.name}]`
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface MentionPickerProps {
  /** Appelé quand une mention est sélectionnée — reçoit "@[Nom]" à insérer */
  onInsert: (mention: string) => void
  /** Textarea ref pour insérer à la position du curseur */
  textareaRef?: React.RefObject<HTMLTextAreaElement>
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function MentionPicker({ onInsert, textareaRef }: MentionPickerProps) {
  const { contacts, isLoading } = useContacts()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (contact: Contact) => {
    const mention = formatMention(contact)

    // Insérer à la position du curseur si le textarea est référencé
    if (textareaRef?.current) {
      const ta = textareaRef.current
      const start = ta.selectionStart ?? ta.value.length
      const end = ta.selectionEnd ?? ta.value.length
      const before = ta.value.slice(0, start)
      const after = ta.value.slice(end)
      const separator = before && !before.endsWith(' ') && !before.endsWith('\n') ? ' ' : ''
      const newValue = `${before}${separator}${mention} ${after}`
      // Déclencher l'onChange via un InputEvent synthétique
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
      )?.set
      nativeInputValueSetter?.call(ta, newValue)
      ta.dispatchEvent(new Event('input', { bubbles: true }))
      // Repositionner le curseur
      const newCursor = start + separator.length + mention.length + 1
      requestAnimationFrame(() => {
        ta.focus()
        ta.setSelectionRange(newCursor, newCursor)
      })
    } else {
      onInsert(mention)
    }

    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((prev) => !prev)}
        className="h-7 px-2 text-xs gap-1 text-gray-600 border-dashed"
      >
        <AtSign className="h-3 w-3" />
        Mentionner
        <ChevronDown className="h-3 w-3" />
      </Button>

      {open && (
        <div className="absolute z-50 top-8 left-0 w-64 bg-white rounded-xl border shadow-lg p-2">
          {/* Recherche */}
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un contact…"
              className="h-7 pl-7 text-xs"
              autoFocus
            />
          </div>

          {/* Liste */}
          <div className="max-h-52 overflow-y-auto space-y-0.5">
            {isLoading ? (
              <p className="text-xs text-gray-400 text-center py-3">Chargement…</p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">
                {contacts.length === 0
                  ? 'Aucun contact enregistré — ajoutez-en dans Paramètres → Contacts'
                  : 'Aucun résultat'}
              </p>
            ) : (
              filtered.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => handleSelect(contact)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-blue-50 text-left transition-colors"
                >
                  <div className="shrink-0 h-6 w-6 rounded-full bg-[#0077B5] flex items-center justify-center">
                    {contact.type === 'company'
                      ? <Building2 className="h-3 w-3 text-white" />
                      : <User className="h-3 w-3 text-white" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-900 truncate">{contact.name}</p>
                    {contact.linkedin_url && (
                      <p className="text-xs text-gray-400 truncate">{contact.linkedin_url.replace('https://www.linkedin.com/in/', '').replace('https://linkedin.com/in/', '').replace(/\/$/, '')}</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Fermer */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
