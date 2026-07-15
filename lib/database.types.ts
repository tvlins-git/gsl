export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type TableDef<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      groups: TableDef<
        { id: string; name: string; created_by: string | null; created_at: string },
        { id?: string; name: string; created_by?: string | null; created_at?: string },
        { id?: string; name?: string; created_by?: string | null; created_at?: string }
      >;
      members: TableDef<
        { id: string; group_id: string; user_id: string; display_name: string; avatar_url: string | null; contact_email: string | null; role: 'admin' | 'member'; created_at: string },
        { id?: string; group_id: string; user_id: string; display_name: string; avatar_url?: string | null; contact_email?: string | null; role?: 'admin' | 'member'; created_at?: string },
        { id?: string; group_id?: string; user_id?: string; display_name?: string; avatar_url?: string | null; contact_email?: string | null; role?: 'admin' | 'member'; created_at?: string }
      >;
      invite_codes: TableDef<
        { id: string; group_id: string; code: string; used_by: string | null; used_at: string | null; expires_at: string; created_at: string },
        { id?: string; group_id: string; code: string; used_by?: string | null; used_at?: string | null; expires_at: string; created_at?: string },
        { id?: string; group_id?: string; code?: string; used_by?: string | null; used_at?: string | null; expires_at?: string; created_at?: string }
      >;
      device_tokens: TableDef<
        { id: string; user_id: string; expo_push_token: string; platform: 'ios' | 'android' | 'web'; created_at: string },
        { id?: string; user_id: string; expo_push_token: string; platform: 'ios' | 'android' | 'web'; created_at?: string },
        { id?: string; user_id?: string; expo_push_token?: string; platform?: 'ios' | 'android' | 'web'; created_at?: string }
      >;
      host_assignments: TableDef<
        { id: string; group_id: string; year: number; month: number; assigned_member_id: string | null; updated_by: string | null; updated_at: string },
        { id?: string; group_id: string; year: number; month: number; assigned_member_id?: string | null; updated_by?: string | null; updated_at?: string },
        { id?: string; group_id?: string; year?: number; month?: number; assigned_member_id?: string | null; updated_by?: string | null; updated_at?: string }
      >;
      polls: TableDef<
        { id: string; group_id: string; title: string; created_by: string; status: 'open' | 'closed'; chosen_slot_id: string | null; created_at: string },
        { id?: string; group_id: string; title: string; created_by: string; status?: 'open' | 'closed'; chosen_slot_id?: string | null; created_at?: string },
        { id?: string; group_id?: string; title?: string; created_by?: string; status?: 'open' | 'closed'; chosen_slot_id?: string | null; created_at?: string }
      >;
      poll_slots: TableDef<
        { id: string; poll_id: string; starts_at: string; ends_at: string },
        { id?: string; poll_id: string; starts_at: string; ends_at: string },
        { id?: string; poll_id?: string; starts_at?: string; ends_at?: string }
      >;
      poll_responses: TableDef<
        { id: string; slot_id: string; member_id: string; response: 'yes' | 'maybe' | 'no' },
        { id?: string; slot_id: string; member_id: string; response: 'yes' | 'maybe' | 'no' },
        { id?: string; slot_id?: string; member_id?: string; response?: 'yes' | 'maybe' | 'no' }
      >;
      photo_events: TableDef<
        { id: string; group_id: string; title: string; event_date: string | null; created_by: string; created_at: string },
        { id?: string; group_id: string; title: string; event_date?: string | null; created_by: string; created_at?: string },
        { id?: string; group_id?: string; title?: string; event_date?: string | null; created_by?: string; created_at?: string }
      >;
      photos: TableDef<
        { id: string; event_id: string; uploaded_by: string; storage_path: string; thumb_path: string | null; ai_score: number | null; width: number | null; height: number | null; created_at: string },
        { id?: string; event_id: string; uploaded_by: string; storage_path: string; thumb_path?: string | null; ai_score?: number | null; width?: number | null; height?: number | null; created_at?: string },
        { id?: string; event_id?: string; uploaded_by?: string; storage_path?: string; thumb_path?: string | null; ai_score?: number | null; width?: number | null; height?: number | null; created_at?: string }
      >;
      threads: TableDef<
        { id: string; group_id: string; name: string; created_by: string; created_at: string },
        { id?: string; group_id: string; name: string; created_by: string; created_at?: string },
        { id?: string; group_id?: string; name?: string; created_by?: string; created_at?: string }
      >;
      thread_members: TableDef<
        { thread_id: string; member_id: string },
        { thread_id: string; member_id: string },
        { thread_id?: string; member_id?: string }
      >;
      messages: TableDef<
        { id: string; thread_id: string; sender_id: string; body: string; created_at: string },
        { id?: string; thread_id: string; sender_id: string; body: string; created_at?: string },
        { id?: string; thread_id?: string; sender_id?: string; body?: string; created_at?: string }
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      bootstrap_admin_group: {
        Args: { p_display_name?: string };
        Returns: Json;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

export type Member = Database['public']['Tables']['members']['Row'];
export type Poll = Database['public']['Tables']['polls']['Row'];
export type PollSlot = Database['public']['Tables']['poll_slots']['Row'];
export type PollResponse = Database['public']['Tables']['poll_responses']['Row'];
export type HostAssignment = Database['public']['Tables']['host_assignments']['Row'];
export type PhotoEvent = Database['public']['Tables']['photo_events']['Row'];
export type Photo = Database['public']['Tables']['photos']['Row'];
export type Thread = Database['public']['Tables']['threads']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
