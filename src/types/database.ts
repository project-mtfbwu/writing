export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          format: string;
          genre: string;
          tone: string;
          logline: string;
          controlling_idea: string;
          status: "draft" | "active" | "archived";
          current_draft_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          format?: string;
          genre?: string;
          tone?: string;
          logline?: string;
          controlling_idea?: string;
          status?: "draft" | "active" | "archived";
          current_draft_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          format?: string;
          genre?: string;
          tone?: string;
          logline?: string;
          controlling_idea?: string;
          status?: "draft" | "active" | "archived";
          current_draft_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_members: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          role: "owner" | "editor" | "viewer";
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          role: "owner" | "editor" | "viewer";
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          role?: "owner" | "editor" | "viewer";
          created_at?: string;
        };
        Relationships: [];
      };
      premises: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          format: string;
          genre: string;
          tone: string;
          protagonist: string;
          inciting_incident: string;
          goal: string;
          stakes: string;
          obstacle: string;
          controlling_idea: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title?: string;
          format?: string;
          genre?: string;
          tone?: string;
          protagonist?: string;
          inciting_incident?: string;
          goal?: string;
          stakes?: string;
          obstacle?: string;
          controlling_idea?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          format?: string;
          genre?: string;
          tone?: string;
          protagonist?: string;
          inciting_incident?: string;
          goal?: string;
          stakes?: string;
          obstacle?: string;
          controlling_idea?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      characters: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          role: string;
          want: string;
          need: string;
          wound: string;
          lie: string;
          arc: string;
          method: string;
          relationship_to_theme: string;
          register: string;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          role?: string;
          want?: string;
          need?: string;
          wound?: string;
          lie?: string;
          arc?: string;
          method?: string;
          relationship_to_theme?: string;
          register?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          role?: string;
          want?: string;
          need?: string;
          wound?: string;
          lie?: string;
          arc?: string;
          method?: string;
          relationship_to_theme?: string;
          register?: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      drafts: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          body: string;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title?: string;
          body?: string;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          body?: string;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      beat_templates: {
        Row: {
          key: string;
          name: string;
          summary: string;
          evidence_status: "E1" | "E2" | "E3" | "E4" | "E5";
          craft_note: string;
          beats: Json;
          is_system: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          name: string;
          summary: string;
          evidence_status?: "E1" | "E2" | "E3" | "E4" | "E5";
          craft_note?: string;
          beats?: Json;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          name?: string;
          summary?: string;
          evidence_status?: "E1" | "E2" | "E3" | "E4" | "E5";
          craft_note?: string;
          beats?: Json;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      beats: {
        Row: {
          id: string;
          project_id: string;
          draft_id: string;
          user_id: string;
          name: string;
          description: string;
          color_key: "neutral" | "setup" | "confrontation" | "resolution" | "character" | "theme";
          sort_order: number;
          template_key: string | null;
          target_percentage: number | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          draft_id: string;
          user_id: string;
          name: string;
          description?: string;
          color_key?: "neutral" | "setup" | "confrontation" | "resolution" | "character" | "theme";
          sort_order?: number;
          template_key?: string | null;
          target_percentage?: number | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          draft_id?: string;
          user_id?: string;
          name?: string;
          description?: string;
          color_key?: "neutral" | "setup" | "confrontation" | "resolution" | "character" | "theme";
          sort_order?: number;
          template_key?: string | null;
          target_percentage?: number | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      scenes: {
        Row: {
          id: string;
          project_id: string;
          draft_id: string;
          user_id: string;
          beat_id: string | null;
          heading: string;
          summary: string;
          location: string;
          time_of_day: string;
          sort_order: number;
          status: "idea" | "outlined" | "drafted" | "polished";
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          draft_id: string;
          user_id: string;
          beat_id?: string | null;
          heading?: string;
          summary?: string;
          location?: string;
          time_of_day?: string;
          sort_order?: number;
          status?: "idea" | "outlined" | "drafted" | "polished";
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          draft_id?: string;
          user_id?: string;
          beat_id?: string | null;
          heading?: string;
          summary?: string;
          location?: string;
          time_of_day?: string;
          sort_order?: number;
          status?: "idea" | "outlined" | "drafted" | "polished";
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      lesson_progress: {
        Row: {
          id: string;
          user_id: string;
          content_version: string;
          course_id: string;
          lesson_id: string;
          completed_exercise_ids: Json;
          completed_step_ids: Json;
          video_position_seconds: number;
          video_completed: boolean;
          completion_count: number;
          completed_at: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content_version: string;
          course_id: string;
          lesson_id: string;
          completed_exercise_ids?: Json;
          completed_step_ids?: Json;
          video_position_seconds?: number;
          video_completed?: boolean;
          completion_count?: number;
          completed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content_version?: string;
          course_id?: string;
          lesson_id?: string;
          completed_exercise_ids?: Json;
          completed_step_ids?: Json;
          video_position_seconds?: number;
          video_completed?: boolean;
          completion_count?: number;
          completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      bookmarks: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          book_title: string;
          chapter_id: string;
          chapter_slug: string;
          chapter_title: string;
          section_id: string | null;
          section_title: string | null;
          heading_id: string | null;
          href: string;
          created_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          book_id: string;
          book_title: string;
          chapter_id: string;
          chapter_slug: string;
          chapter_title: string;
          section_id?: string | null;
          section_title?: string | null;
          heading_id?: string | null;
          href: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          book_id?: string;
          book_title?: string;
          chapter_id?: string;
          chapter_slug?: string;
          chapter_title?: string;
          section_id?: string | null;
          section_title?: string | null;
          heading_id?: string | null;
          href?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      reader_notes: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          book_title: string;
          chapter_id: string;
          chapter_slug: string;
          chapter_title: string;
          section_id: string | null;
          section_title: string | null;
          heading_id: string | null;
          href: string;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          book_id: string;
          book_title: string;
          chapter_id: string;
          chapter_slug: string;
          chapter_title: string;
          section_id?: string | null;
          section_title?: string | null;
          heading_id?: string | null;
          href: string;
          body?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          book_id?: string;
          book_title?: string;
          chapter_id?: string;
          chapter_slug?: string;
          chapter_title?: string;
          section_id?: string | null;
          section_title?: string | null;
          heading_id?: string | null;
          href?: string;
          body?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      exercise_attempts: {
        Row: {
          id: string;
          user_id: string;
          content_version: string;
          course_id: string;
          lesson_id: string;
          exercise_id: string;
          response: Json;
          passed: boolean;
          feedback: string;
          attempt_number: number;
          original_answer: Json;
          applied_project_id: string | null;
          applied_entity_type: string | null;
          applied_entity_id: string | null;
          applied_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          user_id: string;
          content_version: string;
          course_id: string;
          lesson_id: string;
          exercise_id: string;
          response?: Json;
          passed?: boolean;
          feedback?: string;
          attempt_number?: number;
          original_answer?: Json;
          applied_project_id?: string | null;
          applied_entity_type?: string | null;
          applied_entity_id?: string | null;
          applied_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content_version?: string;
          course_id?: string;
          lesson_id?: string;
          exercise_id?: string;
          response?: Json;
          passed?: boolean;
          feedback?: string;
          attempt_number?: number;
          original_answer?: Json;
          applied_project_id?: string | null;
          applied_entity_type?: string | null;
          applied_entity_id?: string | null;
          applied_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      review_findings: {
        Row: {
          id: string;
          user_id: string;
          project_id: string;
          rule_id: string;
          message: string;
          status: "open" | "accepted" | "dismissed" | "fixed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          project_id: string;
          rule_id: string;
          message: string;
          status?: "open" | "accepted" | "dismissed" | "fixed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          project_id?: string;
          rule_id?: string;
          message?: string;
          status?: "open" | "accepted" | "dismissed" | "fixed";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      ensure_project_draft: {
        Args: { p_project_id: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
