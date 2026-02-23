// PostPilot — Gestion des documents (base RAG)
// Sprint 2 : upload, liste, suppression. Sprint 4 : recherche sémantique.

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Upload, Trash2, Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { useOrganization } from '@/hooks/useOrganization'
import { formatDateTime } from '@/lib/utils'
import type { Document } from '@/types/database'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_TYPES = ['application/pdf', 'text/plain', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

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

export default function Documents() {
  const { organizationId } = useOrganization()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)

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

  // Soft delete
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
      toast.success('Document supprimé')
    },
    onError: (err) => toast.error((err as Error).message),
  })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !organizationId) return

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Fichier trop volumineux (max 10 Mo)')
      return
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Format non supporté (PDF, TXT, DOC, DOCX uniquement)')
      return
    }

    setUploading(true)
    try {
      // 1. Upload dans Supabase Storage
      const path = `${organizationId}/${Date.now()}-${file.name}`
      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(path, file)
      if (storageError) throw storageError

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(path)

      // 2. Insérer l'entrée en base (embedding généré par l'Edge Function generate-embedding)
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          organization_id: organizationId,
          title: file.name.replace(/\.[^.]+$/, ''),
          file_url: publicUrl,
          file_type: file.type,
          file_size: file.size,
        })
      if (dbError) throw dbError

      // TODO Sprint 4 : déclencher generate-embedding via n8n webhook
      // await n8nPost('/webhook/generate-embedding', { document_id: doc.id })

      queryClient.invalidateQueries({ queryKey: ['documents', organizationId] })
      toast.success('Document importé avec succès !')
    } catch (err) {
      toast.error((err as Error).message ?? "Erreur lors de l'upload")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const filtered = documents.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-gray-500 mt-1">
            {documents.length} document{documents.length !== 1 ? 's' : ''} importé{documents.length !== 1 ? 's' : ''} — utilisés par l'IA pour personnaliser vos posts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.doc,.docx"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            className="bg-[#0077B5] hover:bg-[#005885]"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            Importer un document
          </Button>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un document…"
          className="pl-9"
        />
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium text-gray-700 mb-1">
              {search ? 'Aucun résultat' : 'Aucun document importé'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {search
                ? 'Essayez un autre terme de recherche.'
                : "Importez vos brochures, cas clients, articles pour enrichir l'IA."}
            </p>
            {!search && (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Importer votre premier document
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="py-3 px-4 flex items-center gap-4">
                <div className="h-9 w-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-[#0077B5]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {doc.title}
                  </p>
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

      {/* Info RAG */}
      <p className="text-xs text-gray-400 text-center">
        Les documents sont analysés par l'IA pour personnaliser vos posts. Formats acceptés : PDF, TXT, DOC, DOCX (max 10 Mo).
      </p>
    </div>
  )
}
