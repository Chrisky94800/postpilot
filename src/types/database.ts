// ============================================================
// PostPilot — Types TypeScript Supabase
// ⚠️  Regénérer avec : supabase gen types typescript \
//       --project-id <PROJECT_ID> > src/types/database.ts
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ─── Enums métier ────────────────────────────────────────────────────────────

export type PostStatus =
  | 'waiting'
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'failed'

export type SourceType =
  | 'manual'
  | 'url'
  | 'vocal'
  | 'document'
  | 'rss'
  | 'calendar_event'

export type PlatformType = 'linkedin' | 'instagram' | 'tiktok'

export type MemberRole = 'owner' | 'admin' | 'member'

export type SubscriptionPlan = 'starter' | 'pro' | 'business'

export type NotificationType =
  | 'post_ready'
  | 'post_published'
  | 'post_failed'
  | 'token_expired'
  | 'token_refreshed'
  | 'analytics_ready'
  | 'rss_found'
  | 'event_reminder'
  | 'error'

export type FeedbackScope =
  | 'full'
  | 'opening'
  | 'closing'
  | 'tone'
  | 'length'
  | 'keywords'

// ─── Row types (lecture) ──────────────────────────────────────────────────────

export type Organization = {
  id: string
  name: string
  slug: string | null
  subscription_plan: SubscriptionPlan
  max_posts_per_month: number
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type OrganizationMember = {
  id: string
  organization_id: string
  user_id: string
  role: MemberRole
  created_at: string
}

export type PostLength = 'short' | 'medium' | 'long'
export type HashtagStrategy = 'none' | 'few' | 'medium' | 'many'

export type BrandProfile = {
  id: string
  organization_id: string
  company_name: string | null
  industry: string | null
  description: string | null
  target_audience: string | null
  tone: string[] | null
  keywords: string[] | null
  example_posts: string[] | null
  posting_frequency: number | null
  preferred_days: string[] | null
  preferred_time: string | null
  // Sprint 1 extras
  emoji_style: number
  post_length: PostLength
  signature: string | null
  keywords_avoid: string[]
  hashtags_preferred: string[]
  hashtag_strategy: HashtagStrategy
  ctas_preferred: string[]
  created_at: string
  updated_at: string
}

export type Document = {
  id: string
  organization_id: string
  title: string
  content: string | null
  file_url: string | null
  file_type: string | null
  file_size: number | null
  embedding: number[] | null
  created_at: string
  deleted_at: string | null
}

export type Platform = {
  id: string
  organization_id: string
  platform_type: PlatformType
  is_active: boolean
  connected_at: string | null
  oauth_tokens: {
    access_token: string
    refresh_token?: string
    refresh_token_expires_at?: string | null
    linkedin_person_id: string
  } | null
  token_expires_at: string | null
  platform_user_id: string | null
  platform_user_name: string | null
  platform_metadata: Json | null
  created_at: string
  updated_at: string
}

export type Post = {
  id: string
  organization_id: string
  brand_profile_id: string | null
  title: string | null
  content: string
  status: PostStatus
  source_type: SourceType | null
  source_url: string | null
  source_content: string | null
  scheduled_at: string | null
  published_at: string | null
  platform_type: PlatformType
  platform_post_id: string | null
  // V2 — Programmes
  program_id: string | null
  position_in_program: number | null
  publication_time: string | null      // format "HH:MM"
  ai_conversation_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// ─── Contacts fréquents (mentions LinkedIn) ──────────────────────────────────

export type ContactType = 'person' | 'company'

export type Contact = {
  id: string
  organization_id: string
  name: string
  linkedin_url: string | null
  linkedin_urn: string | null   // Phase 2 : urn:li:person:XXXX
  type: ContactType
  created_by: string | null
  created_at: string
  updated_at: string
}

// ─── V2 — Programmes de communication ────────────────────────────────────────

export type ProgramStatus = 'draft' | 'active' | 'paused' | 'completed'

export type Program = {
  id: string
  organization_id: string
  title: string
  description: string | null
  start_date: string
  end_date: string
  posts_per_week: number
  status: ProgramStatus
  ai_conversation_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// ─── V2 — Conversations IA ────────────────────────────────────────────────────

export type AiConversationContext = 'program_planning' | 'post_editing'

export type AiMessage = {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export type ExtractedItem = {
  type: 'program'
  data: {
    title: string
    description?: string
    // Format renvoyé par l'Edge Function ai-chat
    start_date?: string
    end_date?: string
    posts_per_week: number
    // Champ legacy (ancienne version du prompt)
    duration_weeks?: number
    posts: { title: string; week: number; theme?: string; day_of_week?: string }[]
  }
  validated: boolean
}

export type AiConversation = {
  id: string
  organization_id: string
  context: AiConversationContext
  title: string | null
  messages: AiMessage[]
  extracted_items: ExtractedItem[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export type PostVersion = {
  id: string
  post_id: string
  organization_id: string
  version_number: number
  content: string
  feedback: string | null
  created_by: string | null
  created_at: string
}

export type PostAnalytics = {
  id: string
  post_id: string
  organization_id: string
  platform_type: PlatformType
  likes_count: number
  comments_count: number
  shares_count: number
  impressions_count: number
  clicks_count: number
  engagement_rate: number | null
  collected_at: string
  raw_data: Json | null
}

export type PostFeedback = {
  id: string
  post_id: string
  organization_id: string
  feedback_text: string
  scope: FeedbackScope
  created_by: string | null
  created_at: string
}

export type RssFeed = {
  id: string
  organization_id: string
  url: string
  title: string | null
  description: string | null
  is_active: boolean
  last_fetched_at: string | null
  fetch_frequency_hours: number
  created_at: string
}

export type CalendarEvent = {
  id: string
  organization_id: string
  title: string
  description: string | null
  event_date: string
  event_type: string | null
  post_generated: boolean
  post_id: string | null
  created_at: string
  updated_at: string
}

export type Notification = {
  id: string
  organization_id: string
  user_id: string
  type: NotificationType
  title: string
  message: string | null
  is_read: boolean
  metadata: Json | null
  created_at: string
}

// ─── Interface Database (format Supabase) ────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization
        Insert: {
          id?: string
          name: string
          slug?: string | null
          subscription_plan?: SubscriptionPlan
          max_posts_per_month?: number
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Omit<Organization, 'id'>>
        Relationships: []
      }
      organization_members: {
        Row: OrganizationMember
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: MemberRole
          created_at?: string
        }
        Update: Partial<Pick<OrganizationMember, 'role'>>
        Relationships: []
      }
      brand_profiles: {
        Row: BrandProfile
        Insert: {
          id?: string
          organization_id: string
          company_name?: string | null
          industry?: string | null
          description?: string | null
          target_audience?: string | null
          tone?: string[] | null
          keywords?: string[] | null
          example_posts?: string[] | null
          posting_frequency?: number | null
          preferred_days?: string[] | null
          preferred_time?: string | null
          emoji_style?: number
          post_length?: PostLength
          signature?: string | null
          keywords_avoid?: string[]
          hashtags_preferred?: string[]
          hashtag_strategy?: HashtagStrategy
          ctas_preferred?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<BrandProfile, 'id' | 'organization_id'>>
        Relationships: []
      }
      documents: {
        Row: Document
        Insert: {
          id?: string
          organization_id: string
          title: string
          content?: string | null
          file_url?: string | null
          file_type?: string | null
          file_size?: number | null
          embedding?: number[] | null
          created_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Omit<Document, 'id' | 'organization_id'>>
        Relationships: []
      }
      platforms: {
        Row: Platform
        Insert: {
          id?: string
          organization_id: string
          platform_type: PlatformType
          is_active?: boolean
          connected_at?: string | null
          oauth_tokens?: Platform['oauth_tokens']
          token_expires_at?: string | null
          platform_user_id?: string | null
          platform_user_name?: string | null
          platform_metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Platform, 'id' | 'organization_id'>>
        Relationships: []
      }
      posts: {
        Row: Post
        Insert: {
          id?: string
          organization_id: string
          brand_profile_id?: string | null
          title?: string | null
          content: string
          status?: PostStatus
          source_type?: SourceType | null
          source_url?: string | null
          source_content?: string | null
          scheduled_at?: string | null
          published_at?: string | null
          platform_type: PlatformType
          platform_post_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: Partial<Omit<Post, 'id' | 'organization_id'>>
        Relationships: []
      }
      post_versions: {
        Row: PostVersion
        Insert: Omit<PostVersion, 'id' | 'created_at'> & {
          id?: string; created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      post_analytics: {
        Row: PostAnalytics
        Insert: Omit<PostAnalytics, 'id'> & { id?: string }
        Update: Record<string, never>
        Relationships: []
      }
      post_feedback: {
        Row: PostFeedback
        Insert: Omit<PostFeedback, 'id' | 'created_at'> & {
          id?: string; created_at?: string
        }
        Update: Record<string, never>
        Relationships: []
      }
      rss_feeds: {
        Row: RssFeed
        Insert: Omit<RssFeed, 'id' | 'created_at'> & {
          id?: string; created_at?: string
        }
        Update: Partial<Omit<RssFeed, 'id' | 'organization_id'>>
        Relationships: []
      }
      calendar_events: {
        Row: CalendarEvent
        Insert: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'> & {
          id?: string; created_at?: string; updated_at?: string
        }
        Update: Partial<Omit<CalendarEvent, 'id' | 'organization_id'>>
        Relationships: []
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at' | 'is_read'> & {
          id?: string; created_at?: string; is_read?: boolean
        }
        Update: Pick<Notification, 'is_read'>
        Relationships: []
      }
      programs: {
        Row: Program
        Insert: {
          id?: string
          organization_id: string
          title: string
          description?: string | null
          start_date: string
          end_date: string
          posts_per_week?: number
          status?: ProgramStatus
          ai_conversation_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Program, 'id' | 'organization_id'>>
        Relationships: []
      }
      ai_conversations: {
        Row: AiConversation
        Insert: {
          id?: string
          organization_id: string
          context?: AiConversationContext
          title?: string | null
          messages?: AiMessage[]
          extracted_items?: ExtractedItem[]
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<AiConversation, 'id' | 'organization_id'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      is_member_of: { Args: { org_id: string }; Returns: boolean }
      is_admin_or_owner_of: { Args: { org_id: string }; Returns: boolean }
      is_owner_of: { Args: { org_id: string }; Returns: boolean }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
