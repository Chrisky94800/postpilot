// PostPilot — Composant upload de médias pour un post LinkedIn
// Supporte : images (jpg, png, gif, webp) et vidéos (mp4, mov)
// Upload vers Supabase Storage bucket "post-media"
// Limite : 50 MB · Vidéo : 1 fichier max · Images : 4 max

import { useRef, useState } from 'react'
import { ImagePlus, Video, X, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const MAX_SIZE_MB = 50
const MAX_IMAGES = 4

interface MediaUploaderProps {
  postId?: string
  mediaUrls: string[]
  mediaType: 'image' | 'video' | 'none'
  onMediaChange: (urls: string[], type: 'image' | 'video' | 'none') => void
}

export default function MediaUploader({ postId, mediaUrls, mediaType, onMediaChange }: MediaUploaderProps) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadFile = async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop()
    const path = `${postId ?? 'tmp'}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('post-media').upload(path, file, {
      contentType: file.type,
      upsert: false,
    })
    if (error) throw new Error(error.message)
    const { data } = supabase.storage.from('post-media').getPublicUrl(path)
    return data.publicUrl
  }

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setError(null)

    // Validations
    const oversized = files.find((f) => f.size > MAX_SIZE_MB * 1024 * 1024)
    if (oversized) { setError(`${oversized.name} dépasse ${MAX_SIZE_MB} MB`); return }
    if (mediaUrls.length + files.length > MAX_IMAGES) {
      setError(`Maximum ${MAX_IMAGES} images par post`); return
    }

    setUploading(true)
    try {
      const urls = await Promise.all(files.map((f) => uploadFile(f)))
      onMediaChange([...mediaUrls, ...urls], 'image')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`La vidéo dépasse ${MAX_SIZE_MB} MB`); return
    }

    setUploading(true)
    try {
      const url = await uploadFile(file)
      onMediaChange([url], 'video')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const removeMedia = (index: number) => {
    const newUrls = mediaUrls.filter((_, i) => i !== index)
    onMediaChange(newUrls, newUrls.length === 0 ? 'none' : mediaType)
  }

  const canAddImage = mediaType !== 'video' && mediaUrls.length < MAX_IMAGES
  const canAddVideo = mediaType === 'none' || (mediaType === 'video' && mediaUrls.length === 0)

  return (
    <div className="space-y-2">
      {/* Boutons d'upload */}
      {(mediaType === 'none' || mediaType === 'image') && (
        <div className="flex items-center gap-2">
          {canAddImage && (
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed text-xs font-medium transition-colors',
                'text-gray-500 hover:text-gray-700 hover:border-gray-400 hover:bg-gray-50',
                uploading && 'opacity-50 cursor-not-allowed',
              )}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
              {mediaUrls.length === 0 ? 'Ajouter une image' : `Image (${mediaUrls.length}/${MAX_IMAGES})`}
            </button>
          )}

          {canAddVideo && mediaUrls.length === 0 && (
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              disabled={uploading}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed text-xs font-medium transition-colors',
                'text-gray-500 hover:text-gray-700 hover:border-gray-400 hover:bg-gray-50',
                uploading && 'opacity-50 cursor-not-allowed',
              )}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Video className="h-3.5 w-3.5" />}
              Ajouter une vidéo
            </button>
          )}
        </div>
      )}

      {/* Inputs cachés */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        multiple
        className="hidden"
        onChange={handleImageSelect}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/quicktime"
        className="hidden"
        onChange={handleVideoSelect}
      />

      {/* Erreur */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Prévisualisations */}
      {mediaUrls.length > 0 && (
        <div className={cn(
          'grid gap-2',
          mediaType === 'image' && mediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2',
        )}>
          {mediaUrls.map((url, i) => (
            <div key={url} className="relative group rounded-lg overflow-hidden border bg-gray-50 aspect-video">
              {mediaType === 'video' ? (
                <video src={url} className="w-full h-full object-cover" controls={false} />
              ) : (
                <img src={url} alt={`Média ${i + 1}`} className="w-full h-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => removeMedia(i)}
                className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
