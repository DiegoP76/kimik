export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          role: "user" | "professional" | "admin";
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          avatar_url?: string | null;
          role?: "user" | "professional" | "admin";
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          avatar_url?: string | null;
          role?: "user" | "professional" | "admin";
          created_at?: string;
        };
      };
      professional_profiles: {
        Row: {
          id: string;
          user_id: string;
          license_number: string;
          specialty: string | null;
          bio: string | null;
          is_verified: boolean;
          rating: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          license_number: string;
          specialty?: string | null;
          bio?: string | null;
          is_verified?: boolean;
          rating?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          license_number?: string;
          specialty?: string | null;
          bio?: string | null;
          is_verified?: boolean;
          rating?: number;
          created_at?: string;
        };
      };
      conflicts: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          audio_url: string | null;
          option_a: string;
          option_b: string;
          category: "convivencia" | "celos" | "dinero" | "familia" | "otros";
          is_premium_analysis: boolean;
          status: "active" | "resolved" | "flagged";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          audio_url?: string | null;
          option_a: string;
          option_b: string;
          category: "convivencia" | "celos" | "dinero" | "familia" | "otros";
          is_premium_analysis?: boolean;
          status?: "active" | "resolved" | "flagged";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          audio_url?: string | null;
          option_a?: string;
          option_b?: string;
          category?: "convivencia" | "celos" | "dinero" | "familia" | "otros";
          is_premium_analysis?: boolean;
          status?: "active" | "resolved" | "flagged";
          created_at?: string;
        };
      };
      votes: {
        Row: {
          id: string;
          conflict_id: string;
          user_id: string;
          selected_option: "A" | "B";
          created_at: string;
        };
        Insert: {
          id?: string;
          conflict_id: string;
          user_id: string;
          selected_option: "A" | "B";
          created_at?: string;
        };
        Update: {
          id?: string;
          conflict_id?: string;
          user_id?: string;
          selected_option?: "A" | "B";
          created_at?: string;
        };
      };
      professional_opinions: {
        Row: {
          id: string;
          conflict_id: string;
          professional_id: string;
          selected_option: "A" | "B";
          feedback_text: string | null;
          audio_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conflict_id: string;
          professional_id: string;
          selected_option: "A" | "B";
          feedback_text?: string | null;
          audio_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conflict_id?: string;
          professional_id?: string;
          selected_option?: "A" | "B";
          feedback_text?: string | null;
          audio_url?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
