// PostPilot — Page éditeur de post (wrapper autour de PostEditorContent)

import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import PostEditorContent from '@/components/editor/PostEditorContent'
import type { Post } from '@/types/database'

// Re-export pour la compatibilité (LinkedInPreview utilisé depuis PostEditor ailleurs)
export { LinkedInPreview } from '@/components/editor/PostEditorContent'

export default function PostEditor() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state ?? {}) as Record<string, string | undefined>
  const ideaTitle       = state.ideaTitle
  const ideaDescription = state.ideaDescription
  const ideaFileUrl     = state.ideaFileUrl
  const ideaFileName    = state.ideaFileName
  const ideaFileType    = state.ideaFileType

  // Charger le post pour détecter s'il appartient à un programme
  const { data: post } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts').select('*').eq('id', id!).single()
      if (error) throw error
      return data as Post
    },
    enabled: !!id,
  })

  // Si le post appartient à un programme, charger les posts du programme
  const { data: programPosts = [] } = useQuery({
    queryKey: ['posts', 'program', post?.program_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, content, status, scheduled_at, position_in_program')
        .eq('program_id', post!.program_id!)
        .is('deleted_at', null)
        .order('scheduled_at', { ascending: true })
      if (error) throw error
      return data as Pick<Post, 'id' | 'title' | 'content' | 'status' | 'scheduled_at' | 'position_in_program'>[]
    },
    enabled: !!post?.program_id,
  })

  const currentIndex = programPosts.findIndex((p) => p.id === id)
  const nextPost = currentIndex >= 0 ? programPosts[currentIndex + 1] : undefined
  const hasProgramNav = !!post?.program_id

  return (
    <div className="space-y-4">

      {/* Barre de navigation programme */}
      {hasProgramNav && (
        <div className="flex items-center justify-between gap-3 pb-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-500 -ml-2"
            onClick={() => navigate(`/programmes/${post.program_id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour au programme
          </Button>

          {nextPost && (
            <Button
              variant="outline"
              size="sm"
              className="text-gray-600"
              onClick={() => navigate(`/posts/${nextPost.id}`)}
            >
              {nextPost.title ?? nextPost.content?.slice(0, 30) ?? 'Post suivant'}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      )}

      <PostEditorContent
        postId={id}
        onNewPostCreated={(newId) => navigate(`/posts/${newId}`, { replace: true })}
        initialTitle={ideaTitle}
        initialIdea={ideaDescription}
        initialFileUrl={ideaFileUrl}
        initialFileName={ideaFileName}
        initialFileType={ideaFileType}
      />
    </div>
  )
}
