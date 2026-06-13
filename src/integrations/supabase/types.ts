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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cycle_settings: {
        Row: {
          cycle_length: number
          last_period_start: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cycle_length?: number
          last_period_start: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cycle_length?: number
          last_period_start?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      day_logs: {
        Row: {
          completed: Json
          date: string
          frozen: Json
          mood: number | null
          stress: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: Json
          date: string
          frozen?: Json
          mood?: number | null
          stress?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: Json
          date?: string
          frozen?: Json
          mood?: number | null
          stress?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      habits: {
        Row: {
          category: string
          created_at: string
          id: string
          name: string
          trigger: string | null
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id: string
          name: string
          trigger?: string | null
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          name?: string
          trigger?: string | null
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          created_at: string
          id: string
          prompt: string
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id: string
          prompt: string
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt?: string
          text?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_media: {
        Row: {
          caption: string | null
          created_at: string
          height: number | null
          id: string
          storage_path: string
          tag: string
          taken_at: string
          updated_at: string
          user_id: string
          width: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          height?: number | null
          id?: string
          storage_path: string
          tag?: string
          taken_at?: string
          updated_at?: string
          user_id: string
          width?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          height?: number | null
          id?: string
          storage_path?: string
          tag?: string
          taken_at?: string
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Relationships: []
      }
      movement_entries: {
        Row: {
          activity_type: string | null
          created_at: string
          date: string
          distance_km: number | null
          duration_minutes: number | null
          id: string
          kind: string
          notes: string | null
          steps: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type?: string | null
          created_at?: string
          date: string
          distance_km?: number | null
          duration_minutes?: number | null
          id?: string
          kind: string
          notes?: string | null
          steps?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string | null
          created_at?: string
          date?: string
          distance_km?: number | null
          duration_minutes?: number | null
          id?: string
          kind?: string
          notes?: string | null
          steps?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active_minutes_goal: number
          birth_date: string | null
          created_at: string
          dashboard_widgets: Json
          display_name: string | null
          gender: Database["public"]["Enums"]["user_gender"]
          height_cm: number | null
          id: string
          initial_weight_kg: number | null
          onboarded: boolean
          onboarding_complete: boolean
          reminder_enabled: boolean
          reminder_time: string
          start_date: string
          step_goal: number
          updated_at: string
          weight_goal_kg: number | null
        }
        Insert: {
          active_minutes_goal?: number
          birth_date?: string | null
          created_at?: string
          dashboard_widgets?: Json
          display_name?: string | null
          gender?: Database["public"]["Enums"]["user_gender"]
          height_cm?: number | null
          id: string
          initial_weight_kg?: number | null
          onboarded?: boolean
          onboarding_complete?: boolean
          reminder_enabled?: boolean
          reminder_time?: string
          start_date?: string
          step_goal?: number
          updated_at?: string
          weight_goal_kg?: number | null
        }
        Update: {
          active_minutes_goal?: number
          birth_date?: string | null
          created_at?: string
          dashboard_widgets?: Json
          display_name?: string | null
          gender?: Database["public"]["Enums"]["user_gender"]
          height_cm?: number | null
          id?: string
          initial_weight_kg?: number | null
          onboarded?: boolean
          onboarding_complete?: boolean
          reminder_enabled?: boolean
          reminder_time?: string
          start_date?: string
          step_goal?: number
          updated_at?: string
          weight_goal_kg?: number | null
        }
        Relationships: []
      }
      schedule_blocks: {
        Row: {
          completed: boolean
          created_at: string
          date: string
          end_minute: number
          habit_id: string | null
          id: string
          notes: string | null
          start_minute: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          date: string
          end_minute: number
          habit_id?: string | null
          id?: string
          notes?: string | null
          start_minute: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          date?: string
          end_minute?: number
          habit_id?: string | null
          id?: string
          notes?: string | null
          start_minute?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      week_freeze_usage: {
        Row: {
          used: number
          user_id: string
          week_key: string
        }
        Insert: {
          used?: number
          user_id: string
          week_key: string
        }
        Update: {
          used?: number
          user_id?: string
          week_key?: string
        }
        Relationships: []
      }
      weight_entries: {
        Row: {
          created_at: string
          date: string
          id: string
          note: string | null
          updated_at: string
          user_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          note?: string | null
          updated_at?: string
          user_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          note?: string | null
          updated_at?: string
          user_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_gender: "female" | "male"
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
      user_gender: ["female", "male"],
    },
  },
} as const
