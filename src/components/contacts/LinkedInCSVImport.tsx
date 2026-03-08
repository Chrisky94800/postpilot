// LinkedInCSVImport.tsx
// Import en masse des connexions LinkedIn depuis le CSV officiel LinkedIn
// Format attendu : "First Name,Last Name,Email Address,Company,Position,Connected On"
// Gestion des doublons : upsert sur (organization_id, name)

import { useRef, useState } from 'react'
import { Upload, Users, CheckCircle2, AlertCircle, Loader2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedContact {
  name: string
  company: string | null
  position: string | null
}

interface ImportResult {
  imported: number
  skipped: number
  total: number
}

interface LinkedInCSVImportProps {
  existingNames: Set<string>
  onImport: (contacts: ParsedContact[]) => Promise<ImportResult>
  compact?: boolean // Mode compact pour l'onboarding
}

// ─── Parsing du CSV LinkedIn ──────────────────────────────────────────────────

function parseLinkedInCSV(text: string): ParsedContact[] {
  const lines = text.split('\n').map((l) => l.trim())

  // LinkedIn ajoute des notes en entête — on cherche la ligne "First Name"
  const headerIdx = lines.findIndex((l) =>
    l.toLowerCase().startsWith('first name')
  )
  if (headerIdx === -1) return []

  const headers = parseCSVLine(lines[headerIdx]).map((h) => h.toLowerCase().trim())
  const firstNameIdx  = headers.findIndex((h) => h === 'first name')
  const lastNameIdx   = headers.findIndex((h) => h === 'last name')
  const companyIdx    = headers.findIndex((h) => h === 'company')
  const positionIdx   = headers.findIndex((h) => h === 'position')

  if (firstNameIdx === -1 || lastNameIdx === -1) return []

  const contacts: ParsedContact[] = []

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    const cols = parseCSVLine(line)
    const firstName = cols[firstNameIdx]?.trim() ?? ''
    const lastName  = cols[lastNameIdx]?.trim()  ?? ''
    const name = [firstName, lastName].filter(Boolean).join(' ')

    if (!name) continue

    contacts.push({
      name,
      company:  companyIdx  !== -1 ? cols[companyIdx]?.trim()  || null : null,
      position: positionIdx !== -1 ? cols[positionIdx]?.trim() || null : null,
    })
  }

  return contacts
}

// Parser CSV simple qui gère les champs entre guillemets
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function LinkedInCSVImport({
  existingNames,
  onImport,
  compact = false,
}: LinkedInCSVImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed]       = useState<ParsedContact[] | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult]       = useState<ImportResult | null>(null)
  const [showInstructions, setShowInstructions] = useState(!compact)
  const [dragOver, setDragOver]   = useState(false)

  const newContacts     = parsed?.filter((c) => !existingNames.has(c.name.toLowerCase())) ?? []
  const existingInFile  = parsed?.filter((c) =>  existingNames.has(c.name.toLowerCase())) ?? []

  const processFile = (file: File) => {
    setError(null)
    setParsed(null)
    setResult(null)

    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Fichier invalide. Veuillez sélectionner un fichier CSV exporté depuis LinkedIn.')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const contacts = parseLinkedInCSV(text)

      if (contacts.length === 0) {
        setError(
          'Aucun contact trouvé. Vérifiez que le fichier est bien l\'export LinkedIn "Connections.csv".'
        )
        return
      }
      setParsed(contacts)
    }
    reader.onerror = () => setError('Erreur lors de la lecture du fichier.')
    reader.readAsText(file, 'UTF-8')
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }

  const handleImport = async () => {
    if (!parsed || parsed.length === 0) return
    setImporting(true)
    try {
      const res = await onImport(parsed)
      setResult(res)
      setParsed(null)
    } catch (err) {
      setError((err as Error).message ?? 'Erreur lors de l\'import.')
    } finally {
      setImporting(false)
    }
  }

  const reset = () => {
    setParsed(null)
    setResult(null)
    setError(null)
  }

  return (
    <div className="space-y-4">

      {/* Instructions LinkedIn */}
      <div className="rounded-lg border border-blue-100 bg-blue-50 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowInstructions((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
        >
          <span className="text-sm font-medium text-blue-800">
            Comment obtenir votre fichier LinkedIn ?
          </span>
          {showInstructions
            ? <ChevronUp className="h-4 w-4 text-blue-600 shrink-0" />
            : <ChevronDown className="h-4 w-4 text-blue-600 shrink-0" />}
        </button>

        {showInstructions && (
          <div className="px-4 pb-4 space-y-3">
            <ol className="space-y-2 text-sm text-blue-800">
              <li className="flex gap-2">
                <span className="font-bold shrink-0">1.</span>
                <span>
                  Rendez-vous sur{' '}
                  <a
                    href="https://www.linkedin.com/mypreferences/d/download-my-data"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold underline underline-offset-2 inline-flex items-center gap-1"
                  >
                    LinkedIn → Télécharger vos données
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold shrink-0">2.</span>
                <span>Sélectionnez <strong>"Connexions"</strong> uniquement (décochez le reste)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold shrink-0">3.</span>
                <span>Cliquez <strong>"Demander l'archive"</strong> — LinkedIn vous envoie un email sous quelques minutes</span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold shrink-0">4.</span>
                <span>Téléchargez l'archive, décompressez-la et récupérez le fichier <strong>Connections.csv</strong></span>
              </li>
              <li className="flex gap-2">
                <span className="font-bold shrink-0">5.</span>
                <span>Glissez-déposez ce fichier ci-dessous</span>
              </li>
            </ol>
            <p className="text-xs text-blue-600">
              LinkedIn prend 2 à 10 minutes pour générer l'export. L'email de confirmation arrive rapidement.
            </p>
          </div>
        )}
      </div>

      {/* Zone de dépôt */}
      {!parsed && !result && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
            dragOver
              ? 'border-[#0077B5] bg-blue-50'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
          )}
        >
          <Upload className="h-8 w-8 mx-auto text-gray-400 mb-3" />
          <p className="text-sm font-medium text-gray-700">
            Glissez votre fichier <strong>Connections.csv</strong> ici
          </p>
          <p className="text-xs text-gray-400 mt-1">ou cliquez pour sélectionner</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFile}
          />
        </div>
      )}

      {/* Erreur de parsing */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Preview des contacts parsés */}
      {parsed && !result && (
        <div className="space-y-3">
          <div className="rounded-lg border bg-white p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-[#0077B5]" />
              <span className="font-medium text-gray-900">
                {parsed.length} connexion{parsed.length > 1 ? 's' : ''} détectée{parsed.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-gray-700">
                  <strong>{newContacts.length}</strong> nouveaux contacts
                </span>
              </div>
              {existingInFile.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-gray-300" />
                  <span className="text-gray-500">
                    <strong>{existingInFile.length}</strong> déjà importés (mis à jour)
                  </span>
                </div>
              )}
            </div>

            {/* Aperçu des 5 premiers */}
            {parsed.slice(0, 5).map((c) => (
              <div key={c.name} className="flex items-center gap-2 text-sm py-1 border-t first:border-t-0">
                <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-medium text-gray-500">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="font-medium text-gray-900 truncate block">{c.name}</span>
                  {(c.position || c.company) && (
                    <span className="text-xs text-gray-400 truncate block">
                      {[c.position, c.company].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </div>
                {existingNames.has(c.name.toLowerCase()) && (
                  <span className="ml-auto text-xs text-gray-400 shrink-0">déjà présent</span>
                )}
              </div>
            ))}
            {parsed.length > 5 && (
              <p className="text-xs text-gray-400 text-center pt-1">
                + {parsed.length - 5} autre{parsed.length - 5 > 1 ? 's' : ''} connexion{parsed.length - 5 > 1 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleImport}
              disabled={importing || parsed.length === 0}
              className="bg-[#0077B5] hover:bg-[#005885] flex-1"
            >
              {importing
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Import en cours…</>
                : <><Users className="h-4 w-4 mr-2" />Importer {parsed.length} contact{parsed.length > 1 ? 's' : ''}</>
              }
            </Button>
            <Button variant="outline" onClick={reset} disabled={importing}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* Résultat import */}
      {result && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-800">Import réussi !</span>
          </div>
          <p className="text-sm text-green-700">
            <strong>{result.imported}</strong> contact{result.imported > 1 ? 's' : ''} importé{result.imported > 1 ? 's' : ''} avec succès.
            {result.skipped > 0 && (
              <> {result.skipped} déjà présent{result.skipped > 1 ? 's' : ''} et mis à jour.</>
            )}
          </p>
          <p className="text-xs text-green-600">
            Vos contacts sont maintenant disponibles dans l'éditeur de post via le bouton @Mentionner.
          </p>
          <Button variant="outline" size="sm" onClick={reset} className="mt-1 border-green-300 text-green-700 hover:bg-green-100">
            Importer un autre fichier
          </Button>
        </div>
      )}
    </div>
  )
}
