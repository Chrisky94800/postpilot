// PostPilot — Mode source : URL / Article

import { useState } from 'react'
import { Link, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { scrapeUrl } from '@/lib/api'

interface SourceURLProps {
  initialUrl?: string
  onGenerate: (url: string, scrapedContent: string) => void
  loading?: boolean
}

export default function SourceURL({ initialUrl = '', onGenerate, loading }: SourceURLProps) {
  const [url, setUrl] = useState(initialUrl)
  const [scraping, setScraping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!url.trim()) return
    setScraping(true)
    setError(null)
    try {
      const res = await scrapeUrl(url.trim())
      onGenerate(url.trim(), `${res.title}\n\n${res.summary}\n\n${res.content}`)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setScraping(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Collez une URL — l'IA extrait l'article et génère un post LinkedIn original.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="source-url" className="flex items-center gap-1.5">
          <Link className="h-3.5 w-3.5 text-gray-400" />
          URL de l'article
        </Label>
        <Input
          id="source-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          placeholder="https://…"
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <Button
        onClick={handleGenerate}
        disabled={scraping || loading || !url.trim()}
        variant="outline"
        className="border-[#0077B5] text-[#0077B5] hover:bg-blue-50"
        size="sm"
      >
        {scraping || loading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Génération en cours…</>
        ) : (
          <><Sparkles className="h-4 w-4 mr-2" />Générer avec l'IA</>
        )}
      </Button>
    </div>
  )
}
