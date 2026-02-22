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
  | 'error'

export type FeedbackScope =
  | 'full'
  | 'opening'
  | 'closing'
  | 'tone'
  | 'length'
  | 'keywords'

// ─── Row types (lecture) ──────────────────────────────────────────────────────

export interface Organization {
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

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: MemberRole
  created_at: string
}

export interface BrandProfile {
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
  created_at: string
  updated_at: string
}

export interface Document {
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

export interface Platform {
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

export interface Post {
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
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface PostVersion {
  id: string
  post_id: string
  organization_id: string
  version_number: number
  content: string
  feedback: string | null
  created_by: string | null
  created_at: string
}

export interface PostAnalytics {
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

export interface PostFeedback {
  id: string
  post_id: string
  organization_id: string
  feedback_text: string
  scope: FeedbackScope
  created_by: string | null
  created_at: string
}

export interface RssFeed {
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

export interface CalendarEvent {
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

export interface Notification {
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
        Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Organization, 'id'>>
      }
      organization_members: {
        Row: OrganizationMember
        Insert: Omit<OrganizationMember, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Pick<OrganizationMember, 'role'>>
      }
      brand_profiles: {
        Row: BrandProfile
        Insert: Omit<BrandProfile, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<BrandProfile, 'id' | 'organization_id'>>
      }
      documents: {
        Row: Document
        Insert: Omit<Document, 'id' | 'created_at' | 'embedding'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<Document, 'id' | 'organization_id'>>
      }
      platforms: {
        Row: Platform
        Insert: Omit<Platform, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Platform, 'id' | 'organization_id'>>
      }
      posts: {
        Row: Post
        Insert: Omit<Post, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Post, 'id' | 'organization_id'>>
      }
      post_versions: {
        Row: PostVersion
        Insert: Omit<PostVersion, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: never
      }
      post_analytics: {
        Row: PostAnalytics
        Insert: Omit<PostAnalytics, 'id'> & { id?: string }
        Update: never
      }
      post_feedback: {
        Row: PostFeedback
        Insert: Omit<PostFeedback, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: never
      }
      rss_feeds: {
        Row: RssFeed
        Insert: Omit<RssFeed, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<RssFeed, 'id' | 'organization_id'>>
      }
      calendar_events: {
        Row: CalendarEvent
        Insert: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<CalendarEvent, 'id' | 'organization_id'>>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at' | 'is_read'> & {
          id?: string
          created_at?: string
          is_read?: boolean
        }
        Update: Pick<Notification, 'is_read'>
      }
    }
    Functions: {
      is_member_of: { Args: { org_id: string }; Returns: boolean }
      is_admin_or_owner_of: { Args: { org_id: string }; Returns: boolean }
      is_owner_of: { Args: { org_id: string }; Returns: boolean }
    }
    Enums: {}
  }
}
