// PostPilot — Sidebar profil de marque dans l'éditeur de post

import { useQuery } from '@tanstack/react-query'
import { Calendar, Clock } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { supabase } from '@/lib/supabase'
import type { BrandProfile } from '@/types/database'

interface BrandProfileSidebarProps {
  organizationId: string
  scheduledAt: string
  publicationTime: string
  onScheduledAtChange: (v: string) => void
  onPublicationTimeChange: (v: string) => void
}

export default function BrandProfileSidebar({
  organizationId,
  scheduledAt,
  publicationTime,
  onScheduledAtChange,
  onPublicationTimeChange,
}: BrandProfileSidebarProps) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['brand_profile', organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_profiles')
        .select('*')
        .eq('organization_id', organizationId)
        .single()
      if (error) throw error
      return data as BrandProfile
    },
    enabled: !!organizationId,
  })

  return (
    <div className="space-y-4 text-sm">
      {/* Profil de marque */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Profil de marque
        </p>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
          </div>
        ) : profile ? (
          <div className="space-y-2 text-xs text-gray-600">
            {profile.company_name && (
              <div>
                <span className="font-medium">🏢</span> {profile.company_name}
              </div>
            )}
            {profile.description && (
              <div className="line-clamp-3 text-gray-500">{profile.description}</div>
            )}
            {profile.target_audience && (
              <div>
                <span className="font-medium">👥</span> {profile.target_audience}
              </div>
            )}
            {profile.tone && profile.tone.length > 0 && (
              <div>
                <span className="font-medium">🎭 Ton :</span>{' '}
                {profile.tone.join(', ')}
              </div>
            )}
            <div>
              <span className="font-medium">😊 Emojis :</span>{' '}
              {profile.emoji_style === 0 ? 'Aucun' : profile.emoji_style <= 2 ? 'Peu' : 'Modéré'}
            </div>
            <div>
              <span className="font-medium">📏 Longueur :</span> {profile.post_length}
            </div>
            {profile.hashtag_strategy && (
              <div>
                <span className="font-medium">#️⃣ Hashtags :</span>{' '}
                {profile.hashtag_strategy}
              </div>
            )}
            {profile.signature && (
              <div>
                <span className="font-medium">✍️ Signature :</span>{' '}
                <span className="italic">{profile.signature}</span>
              </div>
            )}
            {profile.keywords && profile.keywords.length > 0 && (
              <div>
                <span className="font-medium">🎯 Mots-clés :</span>{' '}
                {profile.keywords.slice(0, 5).join(', ')}
              </div>
            )}
            {profile.example_posts && profile.example_posts.length > 0 && (
              <div>
                <span className="font-medium">📌 Exemples :</span>
                <p className="text-gray-400 italic line-clamp-2 mt-0.5">
                  "{profile.example_posts[0].slice(0, 80)}…"
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">
            Profil de marque non configuré.
          </p>
        )}
      </div>

      <div className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2 border border-amber-100">
        Les modifications ici s'appliquent uniquement à ce post. Votre profil de base reste inchangé.
      </div>

      <Separator />

      {/* Publication */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
          <Calendar className="h-3 w-3" />
          Publication
        </p>
        <div className="space-y-1.5">
          <Label className="text-xs">Date</Label>
          <Input
            type="date"
            value={scheduledAt ? scheduledAt.slice(0, 10) : ''}
            onChange={(e) => onScheduledAtChange(e.target.value)}
            min={new Date().toISOString().slice(0, 10)}
            className="text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Heure
          </Label>
          <Input
            type="time"
            value={publicationTime || '09:00'}
            onChange={(e) => onPublicationTimeChange(e.target.value)}
            className="text-xs"
          />
        </div>
      </div>
    </div>
  )
}
