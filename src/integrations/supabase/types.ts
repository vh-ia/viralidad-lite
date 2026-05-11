export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          niche: string | null
          role: 'user' | 'admin'
          scripts_used: number
          queries_used: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          niche?: string | null
          role?: 'user' | 'admin'
          scripts_used?: number
          queries_used?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          niche?: string | null
          role?: 'user' | 'admin'
          scripts_used?: number
          queries_used?: number
          created_at?: string
          updated_at?: string
        }
      }
      scripts: {
        Row: {
          id: string
          user_id: string
          title: string | null
          platform: string | null
          niche: string | null
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string | null
          platform?: string | null
          niche?: string | null
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string | null
          platform?: string | null
          niche?: string | null
          content?: string
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      increment_usage: {
        Args: { p_user_id: string; p_field: string }
        Returns: void
      }
    }
    Enums: Record<string, never>
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type Script = Database['public']['Tables']['scripts']['Row']
