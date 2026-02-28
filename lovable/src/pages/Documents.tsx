// PostPilot — Base de connaissance IA
// Tout ce qui est ici est injecté dans les prompts de l'IA pour personnaliser
// la rédaction des posts (contexte entreprise, audience, valeurs, fichiers…).

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  FileText, Upload, Trash2, Loader2, PenLine, Plus,
  ChevronDown, ChevronUp, Brain, Check, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/hooks/useOrganization'
import { formatDateTime } from '@/lib/utils'
import type { Document } from '@/types/database'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = [
  'application/pdf', 'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

function fileTypeLabel(type: string | null): string {
  const labels: Record<string, string> = {
    'application/pdf': 'PDF',
    'text/plain': 'TXT',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  }
  return type ? (labels[type] ?? type.split('/')[1]?.toUpperCase() ?? 'Fichier') : '?'
}

// ─── Suggestions de notes pré-définies ───────────────────────────────────────

const NOTE_SUGGESTIONS = [
  { label: 'À propos de l\'entreprise', placeholder: 'Décrivez votre entreprise, ce que vous faites, votre marché…' },
  { label: 'Audience cible', placeholder: 'Qui sont vos clients idéaux ? Leurs problèmes, leurs attentes…' },
  { label: 'Valeurs & différenciateurs', placeholder: 'Qu\'est-ce qui vous distingue de la concurrence ? Vos valeurs…' },
  { label: 'Produits & services', placeholder: 'Listez vos offres principales, leurs bénéfices clés…' },
  { label: 'Ton & style de communication', placeholder: 'Comment parlez-vous à votre audience ? Expert, accessible, inspirant…' },
]

// ─── Composant note inline éditable ──────────────────────────────────────────

function NoteItem({ doc, onDelete }: { doc: Document; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(doc.title)
  const [content, setContent] = useState(doc.content ?? '')
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const save = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('documents')
      .update({ title, content })
      .eq('id', doc.id)
    setSaving(false)
    if (error) { toast.error(error.message); return }
    setEditing(false)
    toast.success('Note enregistrée')
  }

  const cancel = () => {
    setTitle(doc.title)
    setContent(doc.content ?? '')
    setEditing(false)
  }

  const preview = content.length > 120 ? content.slice(0, 120) + '…' : content

  return (
    <Card className={editing ? 'ring-2 ring-[#0077B5]' : ''}>
      <CardContent className="py-3 px-4 space-y-2">
        {editing ? (
          <>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="font-medium"
              placeholder="Titre de la note"
            />
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="Contenu…"
              className="text-sm resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={cancel}>
                <X className="h-3.5 w-3.5 mr-1" /> Annuler
              </Button>
              <Button size="sm" className="bg-[#0077B5] hover:bg-[#005885]" onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                Enregistrer
              </Button>
            </div>
          </>
        ) : (
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 bg-purple-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
              <PenLine className="h-4 w-4 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{doc.title}</p>
              {content && (
                <div>
                  <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-wrap">
                    {expanded ? content : preview}
                  </p>
                  {content.length > 120 && (
                    <button
                      onClick={() => setExpanded(!expanded)}
                      className="text-xs text-[#0077B5] flex items-center gap-0.5 mt-0.5"
                    >
                      {expanded ? <><ChevronUp className="h-3 w-3" /> Réduire</> : <><ChevronDown className="h-3 w-3" /> Voir tout</>}
                    </button>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">{formatDateTime(doc.created_at)}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-[#0077B5]" onClick={() => setEditing(true)}>
                <PenLine className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => onDelete(doc.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Documents() {
  const { organizationId } = useOrganization()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [showNoteForm, setShowNoteForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('organization_id', organizationId!)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Document[]
    },
    enabled: !!organizationId,
  })

  const { mutateAsync: deleteDocument } = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase
        .from('documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', docId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', organizationId] })
      toast.success('Supprimé')
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const saveNote = async () => {
    if (!newTitle.trim() || !organizationId) return
    setSavingNote(true)
    const { error } = await supabase.from('documents').insert({
      organization_id: organizationId,
      title: newTitle.trim(),
      content: newContent.trim() || null,
    })
    setSavingNote(false)
    if (error) { toast.error(error.message); return }
    queryClient.invalidateQueries({ queryKey: ['documents', organizationId] })
    toast.success('Note ajoutée — l\'IA l\'utilisera dans ses prochains posts')
    setNewTitle('')
    setNewContent('')
    setShowNoteForm(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !organizationId) return
    if (file.size > MAX_FILE_SIZE) { toast.error('Fichier trop volumineux (max 10 Mo)'); return }
    if (!ALLOWED_TYPES.includes(file.type)) { toast.error('Format non supporté (PDF, TXT, DOC, DOCX)'); return }

    setUploading(true)
    try {
      const path = `${organizationId}/${Date.now()}-${file.name}`
      const { error: storageError } = await supabase.storage.from('documents').upload(path, file)
      if (storageError) throw storageError

      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)

      const { error: dbError } = await supabase.from('documents').insert({
        organization_id: organizationId,
        title: file.name.replace(/\.[^.]+$/, ''),
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size,
      })
      if (dbError) throw dbError

      queryClient.invalidateQueries({ queryKey: ['documents', organizationId] })
      toast.success('Fichier importé — l\'IA l\'utilisera dans ses prochains posts')
    } catch (err) {
      toast.error((err as Error).message ?? "Erreur lors de l'upload")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const notes = documents.filter((d) => !d.file_url)
  const files = documents.filter((d) => !!d.file_url)

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Brain className="h-5 w-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-900">Base de connaissance IA</h2>
        </div>
        <p className="text-sm text-gray-500">
          Tout ce que vous écrivez ou importez ici est injecté dans les prompts de l'IA.
          Plus vous enrichissez cette base, plus vos posts seront personnalisés et pertinents.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          className="bg-[#0077B5] hover:bg-[#005885]"
          onClick={() => { setShowNoteForm(true); setNewTitle(''); setNewContent('') }}
        >
          <PenLine className="h-4 w-4 mr-2" />
          Écrire une note
        </Button>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          Importer un fichier
        </Button>
        <input ref={fileInputRef} type="file" accept=".pdf,.txt,.doc,.docx" className="hidden" onChange={handleFileUpload} />
      </div>

      {/* Formulaire nouvelle note */}
      {showNoteForm && (
        <Card className="ring-2 ring-[#0077B5]">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center gap-2">
              <PenLine className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-900">Nouvelle note</span>
            </div>

            {/* Suggestions rapides */}
            <div className="flex flex-wrap gap-1.5">
              {NOTE_SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => { setNewTitle(s.label); setNewContent('') }}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    newTitle === s.label
                      ? 'bg-[#0077B5] text-white border-[#0077B5]'
                      : 'border-gray-200 text-gray-600 hover:border-[#0077B5] hover:text-[#0077B5]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Titre de la note (ex : À propos de l'entreprise)"
              className="font-medium"
            />
            <Textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={4}
              placeholder={
                NOTE_SUGGESTIONS.find((s) => s.label === newTitle)?.placeholder
                ?? 'Décrivez ce que l\'IA doit savoir…'
              }
              className="text-sm resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowNoteForm(false)}>
                <X className="h-3.5 w-3.5 mr-1" /> Annuler
              </Button>
              <Button
                size="sm"
                className="bg-[#0077B5] hover:bg-[#005885]"
                onClick={saveNote}
                disabled={savingNote || !newTitle.trim()}
              >
                {savingNote ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contenu */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : documents.length === 0 && !showNoteForm ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Brain className="h-10 w-10 mx-auto mb-3 text-gray-200" />
            <p className="font-medium text-gray-700 mb-1">Base de connaissance vide</p>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
              Ajoutez des notes ou importez des fichiers pour que l'IA puisse
              rédiger des posts vraiment personnalisés à votre entreprise.
            </p>
            <div className="flex justify-center gap-2">
              <Button className="bg-[#0077B5] hover:bg-[#005885]" onClick={() => setShowNoteForm(true)}>
                <PenLine className="h-4 w-4 mr-2" />
                Écrire ma première note
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Notes texte */}
          {notes.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <PenLine className="h-3.5 w-3.5" />
                Notes ({notes.length})
              </h3>
              {notes.map((doc) => (
                <NoteItem key={doc.id} doc={doc} onDelete={deleteDocument} />
              ))}
            </div>
          )}

          {/* Fichiers */}
          {files.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                Fichiers ({files.length})
              </h3>
              {files.map((doc) => (
                <Card key={doc.id}>
                  <CardContent className="py-3 px-4 flex items-center gap-4">
                    <div className="h-9 w-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-[#0077B5]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                      <p className="text-xs text-gray-500">
                        {formatDateTime(doc.created_at)}
                        {doc.file_size ? ` · ${formatFileSize(doc.file_size)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary">{fileTypeLabel(doc.file_type)}</Badge>
                      {doc.embedding ? (
                        <Badge className="bg-green-50 text-green-700">Indexé</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-500">En attente</Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-500"
                        onClick={() => deleteDocument(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        Notes et fichiers sont utilisés par l'IA à chaque génération de post.
        Formats acceptés : PDF, TXT, DOC, DOCX (max 10 Mo).
      </p>
    </div>
  )
}
