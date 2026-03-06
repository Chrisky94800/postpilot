// PostPilot — Onboarding Step 4 : Posts exemples & documents

import { useRef, useState } from 'react'
import { Upload, FileText, X, AlertCircle } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StepExamplesData {
  example_posts: [string, string, string]
  files: File[]
}

interface Props {
  data: StepExamplesData
  onChange: (data: Partial<StepExamplesData>) => void
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const ACCEPTED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
const ACCEPTED_EXTENSIONS = '.pdf,.docx,.txt'
const MAX_FILE_SIZE_MB = 10
const MAX_FILES = 5

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / 1_048_576).toFixed(1)} Mo`
}

function fileTypeLabel(file: File) {
  if (file.type === 'application/pdf') return 'PDF'
  if (file.type.includes('word')) return 'DOCX'
  return 'TXT'
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function StepExamples({ data, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  const updateExamplePost = (index: 0 | 1 | 2, value: string) => {
    const updated: [string, string, string] = [...data.example_posts] as [string, string, string]
    updated[index] = value
    onChange({ example_posts: updated })
  }

  const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return
    setFileError(null)
    const valid: File[] = []
    const errors: string[] = []

    Array.from(newFiles).forEach((file) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        errors.push(`${file.name} : format non supporté (PDF, DOCX ou TXT uniquement)`)
        return
      }
      if (file.size > MAX_FILE_SIZE_MB * 1_048_576) {
        errors.push(`${file.name} : trop volumineux (max ${MAX_FILE_SIZE_MB} Mo)`)
        return
      }
      if (data.files.length + valid.length >= MAX_FILES) {
        errors.push(`Maximum ${MAX_FILES} documents`)
        return
      }
      valid.push(file)
    })

    if (errors.length) setFileError(errors[0])
    if (valid.length) onChange({ files: [...data.files, ...valid] })
  }

  const removeFile = (index: number) => {
    onChange({ files: data.files.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Exemples & documents</h2>
        <p className="text-sm text-gray-500 mt-1">
          Ces exemples aident l'IA à apprendre votre style précis (few-shot learning).
          Plus vous en fournissez, meilleurs seront les résultats.
        </p>
      </div>

      {/* Exemples de posts */}
      <div className="space-y-4">
        <Label>Posts LinkedIn que vous avez aimés</Label>
        <p className="text-xs text-gray-500 -mt-2">
          Collez ici des posts (les vôtres ou d'autres) qui correspondent à votre style idéal.
        </p>
        {([0, 1, 2] as const).map((i) => (
          <div key={i} className="space-y-1">
            <span className="text-xs font-medium text-gray-500">Exemple {i + 1}</span>
            <Textarea
              value={data.example_posts[i]}
              onChange={(e) => updateExamplePost(i, e.target.value)}
              placeholder={
                i === 0
                  ? 'Collez ici un post que vous aimez…'
                  : i === 1
                    ? 'Un deuxième exemple (optionnel)…'
                    : 'Un troisième exemple (optionnel)…'
              }
              rows={5}
              maxLength={3000}
              className="text-sm"
            />
            <p className="text-xs text-gray-400 text-right">
              {data.example_posts[i].length}/3000
            </p>
          </div>
        ))}
      </div>

      {/* Upload de documents */}
      <div className="space-y-3">
        <div className="flex items-baseline gap-2">
          <Label>Documents de référence</Label>
          <span className="text-xs text-gray-400">({data.files.length}/{MAX_FILES} max)</span>
        </div>
        <p className="text-xs text-gray-500 -mt-2">
          Plaquettes commerciales, études de cas, articles de blog… L'IA les analysera
          pour enrichir vos posts avec du contenu pertinent.
        </p>

        {/* Zone de drop */}
        <div
          role="button"
          tabIndex={0}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            addFiles(e.dataTransfer.files)
          }}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
            dragOver
              ? 'border-[#0077B5] bg-blue-50/40'
              : 'border-gray-300 hover:border-[#0077B5]/60 bg-gray-50',
            data.files.length >= MAX_FILES && 'pointer-events-none opacity-50',
          )}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">
            Glissez-déposez vos fichiers ici
          </p>
          <p className="text-xs text-gray-500 mt-1">
            ou cliquez pour parcourir — PDF, DOCX, TXT · Max {MAX_FILE_SIZE_MB} Mo/fichier
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
        </div>

        {/* Erreur */}
        {fileError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{fileError}</p>
          </div>
        )}

        {/* Liste des fichiers ajoutés */}
        {data.files.length > 0 && (
          <ul className="space-y-2">
            {data.files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center gap-3 p-3 border rounded-lg bg-white"
              >
                <FileText className="h-5 w-5 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
                </div>
                <Badge variant="secondary" className="text-xs shrink-0">
                  {fileTypeLabel(file)}
                </Badge>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  aria-label={`Supprimer ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-gray-400 border-t pt-3">
        ✅ Vous pourrez ajouter d'autres documents à tout moment depuis la page <strong>Documents</strong>.
      </p>
    </div>
  )
}
