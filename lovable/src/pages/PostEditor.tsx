// PostPilot — Page éditeur de post (wrapper autour de PostEditorContent)

import { useParams, useNavigate } from 'react-router-dom'
import PostEditorContent from '@/components/editor/PostEditorContent'

// Re-export pour la compatibilité (LinkedInPreview utilisé depuis PostEditor ailleurs)
export { LinkedInPreview } from '@/components/editor/PostEditorContent'

export default function PostEditor() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()

  return (
    <div className="space-y-4">
      <PostEditorContent
        postId={id}
        onNewPostCreated={(newId) => navigate(`/posts/${newId}`, { replace: true })}
      />
    </div>
  )
}
