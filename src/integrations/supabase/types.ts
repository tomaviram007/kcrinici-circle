export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_approved: boolean
          is_sold: boolean
          sale_data: Json | null
          sale_image_url: string | null
          sale_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_approved?: boolean
          is_sold?: boolean
          sale_data?: Json | null
          sale_image_url?: string | null
          sale_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_approved?: boolean
          is_sold?: boolean
          sale_data?: Json | null
          sale_image_url?: string | null
          sale_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          event_date: string
          id: string
          image_url: string | null
          location: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          event_date: string
          id?: string
          image_url?: string | null
          location?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          event_date?: string
          id?: string
          image_url?: string | null
          location?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_albums: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_id: string | null
          id: string
          is_approved: boolean
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          is_approved?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          is_approved?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_albums_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_photos: {
        Row: {
          album_id: string
          caption: string | null
          created_at: string
          id: string
          image_url: string
          uploaded_by: string | null
        }
        Insert: {
          album_id: string
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          uploaded_by?: string | null
        }
        Update: {
          album_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_photos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "gallery_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          category: string | null
          company_name: string | null
          contact: string | null
          contact_name: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          is_active: boolean
          is_approved: boolean
          job_type: string | null
          location: string | null
          requirements: string | null
          salary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_name?: string | null
          contact?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          is_active?: boolean
          is_approved?: boolean
          job_type?: string | null
          location?: string | null
          requirements?: string | null
          salary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_name?: string | null
          contact?: string | null
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          is_active?: boolean
          is_approved?: boolean
          job_type?: string | null
          location?: string | null
          requirements?: string | null
          salary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      poll_options: {
        Row: {
          created_at: string
          id: string
          option_text: string
          poll_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_text: string
          poll_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_text?: string
          poll_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_popup_views: {
        Row: {
          created_at: string
          id: string
          poll_id: string
          updated_at: string
          user_id: string
          view_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          poll_id: string
          updated_at?: string
          user_id: string
          view_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          poll_id?: string
          updated_at?: string
          user_id?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_popup_views_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          allow_multiple: boolean
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_displays: number
          show_popup: boolean
          title: string
          updated_at: string
        }
        Insert: {
          allow_multiple?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_displays?: number
          show_popup?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          allow_multiple?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_displays?: number
          show_popup?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string
          avatar_url: string | null
          bio: string | null
          birth_date: string | null
          created_at: string
          expertise: string | null
          full_name: string
          id: string
          is_approved: boolean
          phone: string
          profession: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          expertise?: string | null
          full_name: string
          id?: string
          is_approved?: boolean
          phone: string
          profession: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          expertise?: string | null
          full_name?: string
          id?: string
          is_approved?: boolean
          phone?: string
          profession?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          author: string
          author_title: string
          background_image_url: string | null
          created_at: string
          font_size: number | null
          id: string
          is_active: boolean
          page_location: string | null
          section_height: number | null
          text: string
          updated_at: string
        }
        Insert: {
          author: string
          author_title: string
          background_image_url?: string | null
          created_at?: string
          font_size?: number | null
          id?: string
          is_active?: boolean
          page_location?: string | null
          section_height?: number | null
          text: string
          updated_at?: string
        }
        Update: {
          author?: string
          author_title?: string
          background_image_url?: string | null
          created_at?: string
          font_size?: number | null
          id?: string
          is_active?: boolean
          page_location?: string | null
          section_height?: number | null
          text?: string
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_user: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "chief_editor" | "editor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user", "chief_editor", "editor"],
    },
  },
} as const
