// PostPilot — Textarea avec détection inline du @ pour les mentions LinkedIn
// Quand l'utilisateur tape @, un mini-dropdown apparaît avec les contacts filtrés.
// La sélection insère @[Nom] dans le texte à la position du curseur.

import { useState, useRef, useEffect, useCallback } from 'react'
import { User, Building2 } from 'lucide-react'
import { useContacts } from '@/hooks/useContacts'
import { formatMention } from '@/components/editor/MentionPicker'
import { cn } from '@/lib/utils'

interface InlineMentionTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  className?: string
  textareaRef?: React.RefObject<HTMLTextAreaElement>
}

export default function InlineMentionTextarea({
  value,
  onChange,
  placeholder,
  rows = 10,
  className,
  textareaRef: externalRef,
}: InlineMentionTextareaProps) {
  const internalRef = useRef<HTMLTextAreaElement>(null)
  const ref = externalRef ?? internalRef

  const { contacts } = useContacts()

  // État du dropdown inline
  const [mentionState, setMentionState] = useState<{
    active: boolean
    query: string
    triggerPos: number   // index du @ dans la string
    dropdownTop: number
    dropdownLeft: number
    selectedIndex: number
  }>({ active: false, query: '', triggerPos: -1, dropdownTop: 0, dropdownLeft: 0, selectedIndex: 0 })

  const filtered = mentionState.active
    ? contacts.filter((c) => c.name.toLowerCase().startsWith(mentionState.query.toLowerCase())).slice(0, 6)
    : []

  // Ferme le dropdown
  const closeMention = useCallback(() => {
    setMentionState((s) => ({ ...s, active: false, query: '', triggerPos: -1, selectedIndex: 0 }))
  }, [])

  // Calcule la position approximative du dropdown (sous la ligne courante)
  const getDropdownPos = useCallback((ta: HTMLTextAreaElement) => {
    const rect = ta.getBoundingClientRect()
    const lineHeight = parseInt(getComputedStyle(ta).lineHeight) || 20
    const lines = ta.value.slice(0, ta.selectionStart).split('\n')
    const lineNum = lines.length
    const top = rect.top + window.scrollY + lineNum * lineHeight
    const left = rect.left + window.scrollX + 12
    return { dropdownTop: top, dropdownLeft: left }
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onChange(newValue)

    const cursor = e.target.selectionStart ?? newValue.length
    // Cherche le dernier @ avant le curseur sur la même ligne
    const beforeCursor = newValue.slice(0, cursor)
    const lastNewline = beforeCursor.lastIndexOf('\n')
    const lineText = beforeCursor.slice(lastNewline + 1)
    const atIndex = lineText.lastIndexOf('@')

    if (atIndex !== -1) {
      const query = lineText.slice(atIndex + 1)
      // Annule si espace dans la query (l'@ est trop loin)
      if (!query.includes(' ') && !query.includes('\n')) {
        const pos = getDropdownPos(e.target)
        setMentionState({
          active: true,
          query,
          triggerPos: lastNewline + 1 + atIndex,
          ...pos,
          selectedIndex: 0,
        })
        return
      }
    }
    closeMention()
  }, [onChange, closeMention, getDropdownPos])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!mentionState.active) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setMentionState((s) => ({ ...s, selectedIndex: Math.min(s.selectedIndex + 1, filtered.length - 1) }))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setMentionState((s) => ({ ...s, selectedIndex: Math.max(s.selectedIndex - 1, 0) }))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (filtered.length > 0) {
        e.preventDefault()
        insertMention(filtered[mentionState.selectedIndex])
      }
    } else if (e.key === 'Escape') {
      closeMention()
    }
  }, [mentionState, filtered, closeMention])

  const insertMention = useCallback((contact: (typeof contacts)[0]) => {
    if (!ref.current) return
    const ta = ref.current
    const mention = formatMention(contact)
    // Remplace depuis le @ jusqu'au curseur
    const before = value.slice(0, mentionState.triggerPos)
    const cursor = ta.selectionStart ?? value.length
    const after = value.slice(cursor)
    const newValue = `${before}${mention} ${after}`
    onChange(newValue)
    closeMention()
    // Remet le focus + curseur après la mention
    requestAnimationFrame(() => {
      ta.focus()
      const newCursor = before.length + mention.length + 1
      ta.setSelectionRange(newCursor, newCursor)
    })
  }, [value, mentionState.triggerPos, onChange, closeMention, ref, contacts])

  // Ferme si clic en dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeMention()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [closeMention, ref])

  return (
    <div className="relative">
      <textarea
        ref={ref}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(closeMention, 150)}
        placeholder={placeholder}
        rows={rows}
        className={className}
      />

      {/* Dropdown inline mentions */}
      {mentionState.active && filtered.length > 0 && (
        <div
          className="fixed z-50 w-60 bg-white rounded-xl border shadow-lg py-1"
          style={{ top: mentionState.dropdownTop, left: mentionState.dropdownLeft }}
        >
          {filtered.map((contact, i) => (
            <button
              key={contact.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(contact) }}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors',
                i === mentionState.selectedIndex ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50',
              )}
            >
              <div className="shrink-0 h-5 w-5 rounded-full bg-[#0077B5] flex items-center justify-center">
                {contact.type === 'company'
                  ? <Building2 className="h-2.5 w-2.5 text-white" />
                  : <User className="h-2.5 w-2.5 text-white" />
                }
              </div>
              <span className="truncate font-medium text-gray-900">{contact.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
