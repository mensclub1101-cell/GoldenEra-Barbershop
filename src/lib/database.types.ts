// Generated from the Supabase schema (generate_typescript_types), trimmed to
// what the app uses. peek_invite's display_name/shop_name are nullable for
// owner invites; the generator can't infer that from a LEFT JOIN.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AppRole = "owner" | "barber" | "client";
export type SupplyStatus = "full" | "low" | "out";
export type WalkinStatus = "waiting" | "done" | "no_show";

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      barbers: {
        Row: {
          active: boolean;
          booking_url: string | null;
          created_at: string;
          display_name: string;
          id: string;
          instagram: string | null;
          phone: string | null;
          profile_id: string | null;
          shop_id: string;
          sort: number;
          specialty: string | null;
        };
        Insert: {
          active?: boolean;
          booking_url?: string | null;
          created_at?: string;
          display_name: string;
          id?: string;
          instagram?: string | null;
          phone?: string | null;
          profile_id?: string | null;
          shop_id: string;
          sort?: number;
          specialty?: string | null;
        };
        Update: {
          active?: boolean;
          booking_url?: string | null;
          display_name?: string;
          instagram?: string | null;
          phone?: string | null;
          shop_id?: string;
          sort?: number;
          specialty?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "barbers_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "barbers_shop_id_fkey";
            columns: ["shop_id"];
            isOneToOne: false;
            referencedRelation: "shops";
            referencedColumns: ["id"];
          },
        ];
      };
      invites: {
        Row: {
          barber_id: string | null;
          created_at: string;
          created_by: string | null;
          expires_at: string;
          role: AppRole;
          token: string;
          used_at: string | null;
          used_by: string | null;
        };
        Insert: {
          barber_id?: string | null;
          created_by?: string | null;
          expires_at?: string;
          role: AppRole;
          token?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: "invites_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          favorite_barber_id: string | null;
          full_name: string | null;
          id: string;
          phone: string | null;
          role: AppRole;
        };
        Insert: never;
        Update: {
          favorite_barber_id?: string | null;
          full_name?: string | null;
          phone?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_favorite_barber_id_fkey";
            columns: ["favorite_barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
        ];
      };
      rent_charges: {
        Row: {
          amount_cents: number;
          barber_id: string;
          created_at: string;
          due_date: string;
          id: string;
          note: string | null;
          paid_at: string | null;
        };
        Insert: {
          amount_cents: number;
          barber_id: string;
          due_date: string;
          note?: string | null;
          paid_at?: string | null;
        };
        Update: {
          amount_cents?: number;
          due_date?: string;
          note?: string | null;
          paid_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "rent_charges_barber_id_fkey";
            columns: ["barber_id"];
            isOneToOne: false;
            referencedRelation: "barbers";
            referencedColumns: ["id"];
          },
        ];
      };
      shops: {
        Row: {
          city: string;
          created_at: string;
          hours: string | null;
          id: string;
          name: string;
          phone: string | null;
          photo_url: string | null;
          postal_code: string;
          region: string;
          slug: string;
          sort: number;
          street: string;
        };
        Insert: never;
        Update: {
          hours?: string | null;
          phone?: string | null;
        };
        Relationships: [];
      };
      walkins: {
        Row: {
          barber_id: string | null;
          created_at: string;
          handled_at: string | null;
          handled_by: string | null;
          id: string;
          name: string;
          phone: string;
          shop_id: string;
          status: WalkinStatus;
        };
        Insert: never;
        Update: {
          handled_at?: string | null;
          handled_by?: string | null;
          status?: WalkinStatus;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          barber_id: string;
          created_at: string;
          id: string;
          last_visit_at: string;
          name: string;
          notes: string | null;
          phone: string;
          visits: number;
        };
        Insert: {
          barber_id: string;
          last_visit_at?: string;
          name: string;
          notes?: string | null;
          phone: string;
          visits?: number;
        };
        Update: {
          last_visit_at?: string;
          name?: string;
          notes?: string | null;
          visits?: number;
        };
        Relationships: [];
      };
      supplies: {
        Row: {
          id: string;
          name: string;
          shop_id: string;
          sort: number;
          status: SupplyStatus;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: { name: string; shop_id: string; sort?: number; status?: SupplyStatus };
        Update: { status?: SupplyStatus; updated_at?: string; updated_by?: string | null };
        Relationships: [];
      };
      cleaning_tasks: {
        Row: {
          assignee: string | null;
          done_by: string | null;
          id: string;
          last_done_on: string | null;
          shop_id: string;
          sort: number;
          task: string;
        };
        Insert: { shop_id: string; task: string; sort?: number; assignee?: string | null };
        Update: { assignee?: string | null; done_by?: string | null; last_done_on?: string | null };
        Relationships: [];
      };
      shop_messages: {
        Row: {
          author_id: string;
          author_name: string;
          body: string;
          created_at: string;
          id: string;
          shop_id: string;
        };
        Insert: { author_name: string; body: string; shop_id: string };
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      check_in: {
        Args: { p_shop: string; p_name: string; p_phone: string; p_barber?: string };
        Returns: number;
      };
      claim_invite: {
        Args: { p_token: string };
        Returns: AppRole;
      };
      peek_invite: {
        Args: { p_token: string };
        Returns: {
          display_name: string | null;
          role: AppRole;
          shop_name: string | null;
          valid: boolean;
        }[];
      };
    };
    Enums: { app_role: AppRole; supply_status: SupplyStatus; walkin_status: WalkinStatus };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicTables = Database["public"]["Tables"];
export type Tables<T extends keyof PublicTables> = PublicTables[T]["Row"];
