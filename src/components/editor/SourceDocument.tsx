// PostPilot — Mode source : Document
// Composant simplifié : upload + mode de génération. La génération est dans le parent.

import { FileText, X } from 'lucide-react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

type DocMode = 'synthesis' | 'surprise_me'

interface SourceDocumentProps {
  file: File | null
  onFileChange: (f: File | null) => void
  mode: DocMode
  onModeChange: (m: DocMode) => void
}

export default function SourceDocument({
  file,
  onFileChange,
  mode,
  onModeChange,
}: SourceDocumentProps) {
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onFileChange(f)
    e.target.value = ''
  }

  return (
    <div className="space-y-4">
      {/* Zone de dépôt */}
      <div
        className={`
          border-2 border-dashed rounded-xl p-5 text-center transition-colors
          ${file ? 'border-[#0077B5] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
        `}
      >
        <input
          type="file"
          id="doc-upload"
          accept=".txt,.md,.pdf,.docx"
          className="hidden"
          onChange={handleFile}
        />
        <label htmlFor="doc-upload" className="cursor-pointer block">
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <div className="h-9 w-9 bg-[#0077B5] rounded-lg flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-500">
                  {file.size < 1024 * 1024
                    ? `${Math.round(file.size / 1024)} Ko`
                    : `${(file.size / 1024 / 1024).toFixed(1)} Mo`}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); onFileChange(null) }}
                className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <FileText className="h-8 w-8 text-gray-300 mx-auto" />
              <p className="text-sm font-medium text-gray-700">Cliquer pour importer</p>
              <p className="text-xs text-gray-400">TXT, MD, PDF, DOCX · max 10 Mo</p>
            </div>
          )}
        </label>
      </div>

      {/* Mode de génération */}
      <RadioGroup
        value={mode}
        onValueChange={(v) => onModeChange(v as DocMode)}
        className="space-y-2"
      >
        <label
          htmlFor="synthesis"
          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            mode === 'synthesis'
              ? 'border-[#0077B5] bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <RadioGroupItem value="synthesis" id="synthesis" className="mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900">Synthèse du document</p>
            <p className="text-xs text-gray-500 mt-0.5">
              L'IA résume les points clés en un post structuré
            </p>
          </div>
        </label>
        <label
          htmlFor="surprise_me"
          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
            mode === 'surprise_me'
              ? 'border-[#0077B5] bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <RadioGroupItem value="surprise_me" id="surprise_me" className="mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-900">Angle original</p>
            <p className="text-xs text-gray-500 mt-0.5">
              L'IA choisit un angle inattendu pour surprendre votre audience
            </p>
          </div>
        </label>
      </RadioGroup>
    </div>
  )
}
