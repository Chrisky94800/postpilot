// PostPilot — Mode source : Document

import { useState } from 'react'
import { FileText, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

type DocMode = 'synthesis' | 'surprise_me'

interface SourceDocumentProps {
  onGenerate: (content: string, mode: DocMode) => void
  loading?: boolean
}

export default function SourceDocument({ onGenerate, loading }: SourceDocumentProps) {
  const [mode, setMode] = useState<DocMode>('synthesis')
  const [file, setFile] = useState<File | null>(null)
  const [reading, setReading] = useState(false)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) setFile(f)
  }

  const handleGenerate = async () => {
    if (!file) return
    setReading(true)
    try {
      // Lire le fichier texte côté client (PDF/DOCX seront traités via Edge Function en Sprint 5)
      const text = await file.text()
      onGenerate(text.slice(0, 8000), mode)
    } catch {
      // Fallback : passer le nom du fichier
      onGenerate(`Document : ${file.name}`, mode)
    } finally {
      setReading(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Uploadez un document — l'IA génère un post LinkedIn basé sur son contenu.
      </p>

      {/* Upload */}
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center hover:border-blue-300 transition-colors">
        <input
          type="file"
          id="doc-upload"
          accept=".txt,.md,.pdf,.docx"
          className="hidden"
          onChange={handleFile}
        />
        <label htmlFor="doc-upload" className="cursor-pointer space-y-2 block">
          <FileText className="h-8 w-8 text-gray-300 mx-auto" />
          {file ? (
            <p className="text-sm font-medium text-gray-700">{file.name}</p>
          ) : (
            <>
              <p className="text-sm text-gray-500">Cliquer pour uploader</p>
              <p className="text-xs text-gray-400">TXT, MD, PDF, DOCX · max 10 Mo</p>
            </>
          )}
        </label>
      </div>

      {/* Mode de génération */}
      <div className="space-y-2">
        <Label className="text-sm text-gray-700">Que souhaitez-vous ?</Label>
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as DocMode)} className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="synthesis" id="synthesis" />
            <Label htmlFor="synthesis" className="font-normal text-sm cursor-pointer">
              Une synthèse de ce document
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="surprise_me" id="surprise_me" />
            <Label htmlFor="surprise_me" className="font-normal text-sm cursor-pointer">
              Surprenez-moi (angle original choisi par l'IA)
            </Label>
          </div>
        </RadioGroup>
      </div>

      <Button
        onClick={handleGenerate}
        disabled={reading || loading || !file}
        variant="outline"
        className="border-[#0077B5] text-[#0077B5] hover:bg-blue-50"
        size="sm"
      >
        {reading || loading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Génération en cours…</>
        ) : (
          <><Sparkles className="h-4 w-4 mr-2" />Générer avec l'IA</>
        )}
      </Button>
    </div>
  )
}
