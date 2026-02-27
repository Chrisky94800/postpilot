// PostPilot — Sélecteur de mentions LinkedIn
// Les pages entreprise sont synchronisées depuis LinkedIn (r_organization_social).
// Les personnes peuvent être ajoutées manuellement (API LinkedIn ne permet pas de
// récupérer les connexions sans le Marketing Developer Program).

import { useState, useRef } from 'react'
import { AtSign, Search, User, Building2, X, ChevronDown, Plus, Loader2, Check } from 'lucide-react'
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
  const { contacts, isLoading, createContact } = useContacts()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  // ─── Insertion dans le textarea ─────────────────────────────────────────────

  const handleSelect = (contact: Contact) => {
    const mention = formatMention(contact)

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

  // ─── Ajout d'une personne manuellement ──────────────────────────────────────

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true)
    try {
      await createContact.mutateAsync({
        name: newName.trim(),
        linkedin_url: newUrl.trim() || undefined,
        type: 'person',
      })
      setNewName('')
      setNewUrl('')
      setShowAddForm(false)
    } catch {
      // Silencieux — l'erreur sera visible via le toast du hook si nécessaire
    } finally {
      setAdding(false)
    }
  }

  // ─── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => { setOpen((prev) => !prev); setShowAddForm(false) }}
        className="h-7 px-2 text-xs gap-1 text-gray-600 border-dashed"
      >
        <AtSign className="h-3 w-3" />
        Mentionner
        <ChevronDown className="h-3 w-3" />
      </Button>

      {open && (
        <div className="absolute z-50 top-8 left-0 w-72 bg-white rounded-xl border shadow-lg p-2">
          {/* Fermer */}
          <button
            type="button"
            onClick={() => { setOpen(false); setShowAddForm(false) }}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {!showAddForm ? (
            <>
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
                      ? 'Aucun contact — synchronisez vos pages entreprise depuis Paramètres'
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
                          <p className="text-xs text-gray-400 truncate">
                            {contact.linkedin_url
                              .replace('https://www.linkedin.com/in/', '')
                              .replace('https://linkedin.com/in/', '')
                              .replace('https://www.linkedin.com/company/', '')
                              .replace('https://linkedin.com/company/', '')
                              .replace(/\/$/, '')}
                          </p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Séparateur + bouton ajouter personne */}
              <div className="border-t mt-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter une personne manuellement
                </button>
              </div>
            </>
          ) : (
            /* Formulaire ajout personne */
            <div className="space-y-2 pt-1">
              <p className="text-xs font-medium text-gray-700 px-1">Ajouter une personne</p>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nom complet *"
                className="h-7 text-xs"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              />
              <Input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="URL LinkedIn (optionnel)"
                className="h-7 text-xs"
              />
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  className="flex-1 h-7 text-xs bg-[#0077B5] hover:bg-[#005885]"
                  onClick={handleAdd}
                  disabled={!newName.trim() || adding}
                >
                  {adding
                    ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    : <Check className="h-3 w-3 mr-1" />
                  }
                  Ajouter
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => { setShowAddForm(false); setNewName(''); setNewUrl('') }}
                >
                  Annuler
                </Button>
              </div>
              <p className="text-[10px] text-gray-400 px-1 pb-1">
                L'API LinkedIn ne permet pas de récupérer vos connexions personnelles.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
