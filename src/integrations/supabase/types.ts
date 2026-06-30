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
      ad_campaigns: {
        Row: {
          advertiser_id: string
          alt_text: string | null
          click_count: number
          created_at: string
          end_date: string | null
          id: string
          impression_count: number
          is_active: boolean
          max_appearances: number
          media_type: string
          media_url: string
          placement: string
          price: number | null
          priority: number
          start_date: string
          target_page: string
          target_url: string
          title: string
          updated_at: string
        }
        Insert: {
          advertiser_id: string
          alt_text?: string | null
          click_count?: number
          created_at?: string
          end_date?: string | null
          id?: string
          impression_count?: number
          is_active?: boolean
          max_appearances?: number
          media_type?: string
          media_url: string
          placement?: string
          price?: number | null
          priority?: number
          start_date: string
          target_page?: string
          target_url: string
          title: string
          updated_at?: string
        }
        Update: {
          advertiser_id?: string
          alt_text?: string | null
          click_count?: number
          created_at?: string
          end_date?: string | null
          id?: string
          impression_count?: number
          is_active?: boolean
          max_appearances?: number
          media_type?: string
          media_url?: string
          placement?: string
          price?: number | null
          priority?: number
          start_date?: string
          target_page?: string
          target_url?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "advertisers"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_clicks: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_clicks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_impressions: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_impressions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      advertisers: {
        Row: {
          business_name: string
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          business_name: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          business_name?: string
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
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
          sale_gallery_urls: string[] | null
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
          sale_gallery_urls?: string[] | null
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
          sale_gallery_urls?: string[] | null
          sale_image_url?: string | null
          sale_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_title: string | null
          entity_type: string
          id: string
          user_id: string
          user_name: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_title?: string | null
          entity_type: string
          id?: string
          user_id: string
          user_name?: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_title?: string | null
          entity_type?: string
          id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      birthday_email_log: {
        Row: {
          error_message: string | null
          id: string
          recipient_email: string
          resend_id: string | null
          sent_at: string
          sent_year: number
          status: string
          user_id: string
        }
        Insert: {
          error_message?: string | null
          id?: string
          recipient_email: string
          resend_id?: string | null
          sent_at?: string
          sent_year: number
          status?: string
          user_id: string
        }
        Update: {
          error_message?: string | null
          id?: string
          recipient_email?: string
          resend_id?: string | null
          sent_at?: string
          sent_year?: number
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      birthday_email_template: {
        Row: {
          bg_color: string | null
          body_html: string
          button_color: string | null
          from_name: string | null
          heading: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          preview_text: string | null
          reply_to: string | null
          signature: string | null
          subject: string
          text_color: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bg_color?: string | null
          body_html?: string
          button_color?: string | null
          from_name?: string | null
          heading?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          preview_text?: string | null
          reply_to?: string | null
          signature?: string | null
          subject?: string
          text_color?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bg_color?: string | null
          body_html?: string
          button_color?: string | null
          from_name?: string | null
          heading?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          preview_text?: string | null
          reply_to?: string | null
          signature?: string | null
          subject?: string
          text_color?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      content_access_settings: {
        Row: {
          content_type: string
          public_action_enabled: boolean
          public_card_open_enabled: boolean
          public_contact_enabled: boolean
          public_images_enabled: boolean
          public_list_enabled: boolean
          public_price_enabled: boolean
          updated_at: string
        }
        Insert: {
          content_type: string
          public_action_enabled?: boolean
          public_card_open_enabled?: boolean
          public_contact_enabled?: boolean
          public_images_enabled?: boolean
          public_list_enabled?: boolean
          public_price_enabled?: boolean
          updated_at?: string
        }
        Update: {
          content_type?: string
          public_action_enabled?: boolean
          public_card_open_enabled?: boolean
          public_contact_enabled?: boolean
          public_images_enabled?: boolean
          public_list_enabled?: boolean
          public_price_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          benefit_type: string | null
          benefit_value: number | null
          business_logo_url: string | null
          business_name: string
          business_phone: string | null
          category: string
          claim_count: number
          coupon_code: string | null
          created_at: string
          created_by: string | null
          description: string
          discount_label: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          is_approved: boolean
          title: string
          updated_at: string
          website_click_count: number
          website_url: string | null
        }
        Insert: {
          benefit_type?: string | null
          benefit_value?: number | null
          business_logo_url?: string | null
          business_name: string
          business_phone?: string | null
          category?: string
          claim_count?: number
          coupon_code?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          discount_label?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_approved?: boolean
          title: string
          updated_at?: string
          website_click_count?: number
          website_url?: string | null
        }
        Update: {
          benefit_type?: string | null
          benefit_value?: number | null
          business_logo_url?: string | null
          business_name?: string
          business_phone?: string | null
          category?: string
          claim_count?: number
          coupon_code?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          discount_label?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_approved?: boolean
          title?: string
          updated_at?: string
          website_click_count?: number
          website_url?: string | null
        }
        Relationships: []
      }
      email_alert_state: {
        Row: {
          id: boolean
          last_alerted_at: string
        }
        Insert: {
          id?: boolean
          last_alerted_at?: string
        }
        Update: {
          id?: boolean
          last_alerted_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      event_participant_removals: {
        Row: {
          email: string | null
          event_id: string | null
          event_title: string
          id: string
          participant_name: string
          payment_status: string | null
          phone: string | null
          reason: string
          removed_at: string
          removed_by: string | null
          source: string
        }
        Insert: {
          email?: string | null
          event_id?: string | null
          event_title: string
          id?: string
          participant_name: string
          payment_status?: string | null
          phone?: string | null
          reason: string
          removed_at?: string
          removed_by?: string | null
          source?: string
        }
        Update: {
          email?: string | null
          event_id?: string | null
          event_title?: string
          id?: string
          participant_name?: string
          payment_status?: string | null
          phone?: string | null
          reason?: string
          removed_at?: string
          removed_by?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participant_removals_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          amount_paid: number | null
          attendance_confirmed: boolean
          confirm_token: string
          created_at: string
          email: string
          event_id: string
          first_name: string
          id: string
          last_name: string
          payment_status: string
          phone: string
          transaction_ref: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_paid?: number | null
          attendance_confirmed?: boolean
          confirm_token?: string
          created_at?: string
          email: string
          event_id: string
          first_name: string
          id?: string
          last_name: string
          payment_status?: string
          phone: string
          transaction_ref?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_paid?: number | null
          attendance_confirmed?: boolean
          confirm_token?: string
          created_at?: string
          email?: string
          event_id?: string
          first_name?: string
          id?: string
          last_name?: string
          payment_status?: string
          phone?: string
          transaction_ref?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_reminders_log: {
        Row: {
          channel: string
          event_id: string
          id: string
          sent_at: string
          user_id: string
        }
        Insert: {
          channel: string
          event_id: string
          id?: string
          sent_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          event_id?: string
          id?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          payment_status: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          payment_status?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          payment_status?: string
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
          end_date: string | null
          event_date: string
          id: string
          image_url: string | null
          is_admin_only: boolean
          location: string | null
          max_participants: number | null
          payment_link: string | null
          price: number | null
          registration_required: boolean
          title: string
          updated_at: string
          waze_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description: string
          end_date?: string | null
          event_date: string
          id?: string
          image_url?: string | null
          is_admin_only?: boolean
          location?: string | null
          max_participants?: number | null
          payment_link?: string | null
          price?: number | null
          registration_required?: boolean
          title: string
          updated_at?: string
          waze_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          end_date?: string | null
          event_date?: string
          id?: string
          image_url?: string | null
          is_admin_only?: boolean
          location?: string | null
          max_participants?: number | null
          payment_link?: string | null
          price?: number | null
          registration_required?: boolean
          title?: string
          updated_at?: string
          waze_url?: string | null
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
          is_approved: boolean
          uploaded_by: string | null
        }
        Insert: {
          album_id: string
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          is_approved?: boolean
          uploaded_by?: string | null
        }
        Update: {
          album_id?: string
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          is_approved?: boolean
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
      professional_recommendations: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          is_admin_post: boolean
          is_approved: boolean
          is_hidden: boolean
          phone: string
          professional_first_name: string
          professional_last_name: string | null
          professional_name: string
          rating: number
          recommender_name: string
          recommender_user_id: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          is_admin_post?: boolean
          is_approved?: boolean
          is_hidden?: boolean
          phone: string
          professional_first_name?: string
          professional_last_name?: string | null
          professional_name: string
          rating?: number
          recommender_name: string
          recommender_user_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          is_admin_post?: boolean
          is_approved?: boolean
          is_hidden?: boolean
          phone?: string
          professional_first_name?: string
          professional_last_name?: string | null
          professional_name?: string
          rating?: number
          recommender_name?: string
          recommender_user_id?: string | null
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
          display_name: string | null
          email_opt_in: boolean
          expertise: string | null
          facebook_url: string | null
          first_name: string | null
          full_name: string
          hobbies: string | null
          id: string
          instagram_url: string | null
          is_approved: boolean
          is_removed: boolean
          last_name: string | null
          linkedin_url: string | null
          phone: string
          profession: string
          send_birthday_email: boolean
          show_in_birthday_list: boolean
          updated_at: string
          user_id: string
          website_url: string | null
        }
        Insert: {
          address: string
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string | null
          email_opt_in?: boolean
          expertise?: string | null
          facebook_url?: string | null
          first_name?: string | null
          full_name: string
          hobbies?: string | null
          id?: string
          instagram_url?: string | null
          is_approved?: boolean
          is_removed?: boolean
          last_name?: string | null
          linkedin_url?: string | null
          phone: string
          profession: string
          send_birthday_email?: boolean
          show_in_birthday_list?: boolean
          updated_at?: string
          user_id: string
          website_url?: string | null
        }
        Update: {
          address?: string
          avatar_url?: string | null
          bio?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string | null
          email_opt_in?: boolean
          expertise?: string | null
          facebook_url?: string | null
          first_name?: string | null
          full_name?: string
          hobbies?: string | null
          id?: string
          instagram_url?: string | null
          is_approved?: boolean
          is_removed?: boolean
          last_name?: string | null
          linkedin_url?: string | null
          phone?: string
          profession?: string
          send_birthday_email?: boolean
          show_in_birthday_list?: boolean
          updated_at?: string
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      promo_banners: {
        Row: {
          body: string | null
          button_text: string | null
          button_url: string | null
          created_at: string
          created_by: string | null
          days_of_week: number[] | null
          display_order: number
          emoji: string | null
          end_date: string | null
          id: string
          is_active: boolean
          start_date: string | null
          target_page: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          button_text?: string | null
          button_url?: string | null
          created_at?: string
          created_by?: string | null
          days_of_week?: number[] | null
          display_order?: number
          emoji?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          start_date?: string | null
          target_page?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          button_text?: string | null
          button_url?: string | null
          created_at?: string
          created_by?: string | null
          days_of_week?: number[] | null
          display_order?: number
          emoji?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean
          start_date?: string | null
          target_page?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
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
      secondhand_items: {
        Row: {
          category: string
          condition: string
          contact_phone: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          guest_email: string | null
          guest_name: string | null
          id: string
          images: string[]
          is_active: boolean
          is_approved: boolean
          is_sold: boolean
          price: number | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          condition?: string
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          images?: string[]
          is_active?: boolean
          is_approved?: boolean
          is_sold?: boolean
          price?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          condition?: string
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          images?: string[]
          is_active?: boolean
          is_approved?: boolean
          is_sold?: boolean
          price?: number | null
          title?: string
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      telegram_bot_state: {
        Row: {
          id: number
          update_offset: number
          updated_at: string
        }
        Insert: {
          id: number
          update_offset?: number
          updated_at?: string
        }
        Update: {
          id?: number
          update_offset?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          permission: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          id?: string
          permission: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          permission?: string
          updated_at?: string
          user_id?: string
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
      admin_get_email_logs: {
        Args: {
          _end?: string
          _limit?: number
          _offset?: number
          _search?: string
          _start?: string
          _status?: string
          _template?: string
        }
        Returns: {
          created_at: string
          error_message: string
          message_id: string
          metadata: Json
          recipient_email: string
          status: string
          template_name: string
          total_count: number
        }[]
      }
      admin_get_email_stats: {
        Args: { _end?: string; _start?: string }
        Returns: Json
      }
      admin_list_mailing_list: {
        Args: never
        Returns: {
          email: string
          email_opt_in: boolean
          full_name: string
          is_approved: boolean
          is_suppressed: boolean
          suppressed_at: string
          suppression_reason: string
          user_id: string
        }[]
      }
      admin_remove_suppression: { Args: { _email: string }; Returns: undefined }
      admin_set_email_opt_in: {
        Args: { _opt_in: boolean; _user_id: string }
        Returns: undefined
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_active_ad_campaigns: {
        Args: never
        Returns: {
          advertiser_id: string
          alt_text: string
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          max_appearances: number
          media_type: string
          media_url: string
          placement: string
          priority: number
          start_date: string
          target_page: string
          target_url: string
          title: string
          updated_at: string
        }[]
      }
      get_birthdays_for_date: {
        Args: { _day: number; _month: number }
        Returns: {
          display_name: string
          email: string
          email_opt_in: boolean
          first_name: string
          full_name: string
          is_approved: boolean
          phone: string
          send_birthday_email: boolean
          user_id: string
        }[]
      }
      get_birthdays_in_month: {
        Args: { _month: number }
        Returns: {
          birth_date: string
          display_name: string
          email: string
          email_opt_in: boolean
          first_name: string
          full_name: string
          is_approved: boolean
          phone: string
          send_birthday_email: boolean
          show_in_birthday_list: boolean
          user_id: string
        }[]
      }
      get_content_access: {
        Args: { _content_type: string }
        Returns: {
          content_type: string
          public_action_enabled: boolean
          public_card_open_enabled: boolean
          public_contact_enabled: boolean
          public_images_enabled: boolean
          public_list_enabled: boolean
          public_price_enabled: boolean
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "content_access_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_event_attending_counts: {
        Args: { _event_ids: string[] }
        Returns: {
          attending_count: number
          event_id: string
        }[]
      }
      get_event_participant_counts: {
        Args: { _event_ids: string[] }
        Returns: {
          event_id: string
          participant_count: number
        }[]
      }
      get_latest_event_banner: {
        Args: never
        Returns: {
          album_id: string
          event_date: string
          event_id: string
          image_url: string
          title: string
        }[]
      }
      get_member_secondhand: {
        Args: never
        Returns: {
          category: string
          condition: string
          contact_phone: string
          created_at: string
          created_by: string
          currency: string
          description: string
          id: string
          images: string[]
          is_active: boolean
          is_approved: boolean
          is_sold: boolean
          price: number
          title: string
        }[]
      }
      get_poll_results: {
        Args: { _poll_id: string }
        Returns: {
          option_id: string
          total_votes: number
          vote_count: number
        }[]
      }
      get_public_deals: {
        Args: never
        Returns: {
          benefit_type: string
          benefit_value: number
          business_logo_url: string
          business_name: string
          category: string
          created_at: string
          description: string
          discount_label: string
          expires_at: string
          id: string
          title: string
        }[]
      }
      get_public_events: {
        Args: never
        Returns: {
          created_at: string
          description: string
          end_date: string
          event_date: string
          id: string
          image_url: string
          is_admin_only: boolean
          max_participants: number
          price: number
          registration_required: boolean
          title: string
        }[]
      }
      get_public_jobs: {
        Args: never
        Returns: {
          category: string
          company_name: string
          created_at: string
          id: string
          job_type: string
          location: string
          summary: string
          title: string
        }[]
      }
      get_public_members: {
        Args: never
        Returns: {
          avatar_url: string
          first_name: string
          id: string
          profession: string
        }[]
      }
      get_public_recommendations: {
        Args: never
        Returns: {
          category: string
          created_at: string
          description: string
          id: string
          is_admin_post: boolean
          professional_first_name: string
          rating: number
          recommender_name: string
        }[]
      }
      get_public_secondhand: {
        Args: never
        Returns: {
          category: string
          condition: string
          created_at: string
          currency: string
          description: string
          id: string
          images: string[]
          is_sold: boolean
          price: number
          title: string
        }[]
      }
      get_public_stats: { Args: never; Returns: Json }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_deal_counter: {
        Args: { counter_name: string; deal_id: string }
        Returns: undefined
      }
      is_approved_user: { Args: { _user_id: string }; Returns: boolean }
      mark_email_suppressed: {
        Args: { _email: string; _metadata?: Json; _reason: string }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      track_ad_click: {
        Args: { p_campaign_id: string; p_user_id?: string }
        Returns: undefined
      }
      track_ad_impression: {
        Args: { p_campaign_id: string; p_user_id?: string }
        Returns: undefined
      }
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
