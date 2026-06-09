export type Json =
  | boolean
  | null
  | number
  | string
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    CompositeTypes: Record<string, never>;
    Enums: {
      agent_status:
        | "present"
        | "absent"
        | "sick_leave"
        | "paid_leave"
        | "replacement"
        | "unknown";
      building_priority_level: "low" | "normal" | "high" | "critical";
      checklist_result_status: "compliant" | "non_compliant" | "not_applicable";
      control_area_result_status: "satisfying" | "unsatisfying";
      control_quality_rating:
        | "satisfying"
        | "acceptable"
        | "to_improve"
        | "unsatisfying";
      control_status: "draft" | "completed" | "canceled";
      corrective_action_status: "open" | "in_progress" | "done" | "canceled";
      member_role: "owner" | "admin" | "team_lead" | "cleaner";
      priority_level: "low" | "normal" | "high";
      workspace_type: "personal" | "team";
    };
    Functions: {
      ensure_personal_workspace: {
        Args: { workspace_name?: string | null };
        Returns: {
          created_at: string;
          organization_id: string;
          organization_name: string;
          updated_at: string;
        }[];
      };
      is_org_admin: {
        Args: { target_organization_id: string };
        Returns: boolean;
      };
      is_org_member: {
        Args: { target_organization_id: string };
        Returns: boolean;
      };
      set_updated_at: {
        Args: Record<string, never>;
        Returns: unknown;
      };
    };
    Tables: {
      agents: {
        Insert: {
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          id: string;
          name: string;
          organization_id: string;
          status?: Database["public"]["Enums"]["agent_status"];
          updated_at?: string;
        };
        Relationships: [];
        Row: {
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          id: string;
          name: string;
          organization_id: string;
          status: Database["public"]["Enums"]["agent_status"];
          updated_at: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          status?: Database["public"]["Enums"]["agent_status"];
          updated_at?: string;
        };
      };
      buildings: {
        Insert: {
          agent_status?: Database["public"]["Enums"]["agent_status"];
          areas_to_check?: Json;
          assigned_agent_id?: string | null;
          assigned_agent_ids?: string[];
          assigned_agent_name?: string | null;
          access_notes?: string | null;
          address?: string | null;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          id: string;
          internal_notes?: string | null;
          last_control_at?: string | null;
          name: string;
          organization_id: string;
          priority_level?: Database["public"]["Enums"]["building_priority_level"];
          priority_score?: number;
          sector?: string;
          service_days?: Json;
          updated_at?: string;
        };
        Relationships: [];
        Row: {
          agent_status: Database["public"]["Enums"]["agent_status"];
          areas_to_check: Json;
          assigned_agent_id: string | null;
          assigned_agent_ids: string[];
          assigned_agent_name: string | null;
          access_notes: string | null;
          address: string | null;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          id: string;
          internal_notes: string | null;
          last_control_at: string | null;
          name: string;
          organization_id: string;
          priority_level: Database["public"]["Enums"]["building_priority_level"];
          priority_score: number;
          sector: string;
          service_days: Json;
          updated_at: string;
        };
        Update: {
          agent_status?: Database["public"]["Enums"]["agent_status"];
          areas_to_check?: Json;
          assigned_agent_id?: string | null;
          assigned_agent_ids?: string[];
          assigned_agent_name?: string | null;
          access_notes?: string | null;
          address?: string | null;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          id?: string;
          internal_notes?: string | null;
          last_control_at?: string | null;
          name?: string;
          organization_id?: string;
          priority_level?: Database["public"]["Enums"]["building_priority_level"];
          priority_score?: number;
          sector?: string;
          service_days?: Json;
          updated_at?: string;
        };
      };
      building_sectors: {
        Insert: {
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          id: string;
          name: string;
          organization_id: string;
          updated_at?: string;
        };
        Relationships: [];
        Row: {
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          id: string;
          name: string;
          organization_id: string;
          updated_at: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          id?: string;
          name?: string;
          organization_id?: string;
          updated_at?: string;
        };
      };
      checklist_items: {
        Insert: {
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          description?: string | null;
          id: string;
          is_active?: boolean;
          is_required?: boolean;
          label: string;
          organization_id: string;
          position: number;
          updated_at?: string;
        };
        Relationships: [];
        Row: {
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          description: string | null;
          id: string;
          is_active: boolean;
          is_required: boolean;
          label: string;
          organization_id: string;
          position: number;
          updated_at: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          is_required?: boolean;
          label?: string;
          organization_id?: string;
          position?: number;
          updated_at?: string;
        };
      };
      control_area_results: {
        Insert: {
          area:
            | "outdoor"
            | "hall"
            | "elevator"
            | "stairs"
            | "floor_landings"
            | "basement_access"
            | "common_areas"
            | "garage";
          control_id: string;
          created_at?: string;
          id: string;
          organization_id: string;
          status: Database["public"]["Enums"]["control_area_result_status"];
          updated_at?: string;
        };
        Relationships: [];
        Row: {
          area:
            | "outdoor"
            | "hall"
            | "elevator"
            | "stairs"
            | "floor_landings"
            | "basement_access"
            | "common_areas"
            | "garage";
          control_id: string;
          created_at: string;
          id: string;
          organization_id: string;
          status: Database["public"]["Enums"]["control_area_result_status"];
          updated_at: string;
        };
        Update: {
          area?:
            | "outdoor"
            | "hall"
            | "elevator"
            | "stairs"
            | "floor_landings"
            | "basement_access"
            | "common_areas"
            | "garage";
          control_id?: string;
          created_at?: string;
          id?: string;
          organization_id?: string;
          status?: Database["public"]["Enums"]["control_area_result_status"];
          updated_at?: string;
        };
      };
      control_checklist_results: {
        Insert: {
          checklist_item_id: string;
          comment?: string | null;
          control_id: string;
          created_at?: string;
          id: string;
          organization_id: string;
          status: Database["public"]["Enums"]["checklist_result_status"];
          updated_at?: string;
        };
        Relationships: [];
        Row: {
          checklist_item_id: string;
          comment: string | null;
          control_id: string;
          created_at: string;
          id: string;
          organization_id: string;
          status: Database["public"]["Enums"]["checklist_result_status"];
          updated_at: string;
        };
        Update: {
          checklist_item_id?: string;
          comment?: string | null;
          control_id?: string;
          created_at?: string;
          id?: string;
          organization_id?: string;
          status?: Database["public"]["Enums"]["checklist_result_status"];
          updated_at?: string;
        };
      };
      control_photos: {
        Insert: {
          building_id: string;
          caption?: string | null;
          control_id: string;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          file_name: string;
          id: string;
          mime_type: "image/jpeg" | "image/png" | "image/webp";
          organization_id: string;
          size_bytes: number;
          storage_bucket?: "control-photos";
          storage_path: string;
          updated_at?: string;
          uploaded_at: string;
        };
        Relationships: [];
        Row: {
          building_id: string;
          caption: string | null;
          control_id: string;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          file_name: string;
          id: string;
          mime_type: "image/jpeg" | "image/png" | "image/webp";
          organization_id: string;
          size_bytes: number;
          storage_bucket: "control-photos";
          storage_path: string;
          updated_at: string;
          uploaded_at: string;
        };
        Update: {
          building_id?: string;
          caption?: string | null;
          control_id?: string;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          file_name?: string;
          id?: string;
          mime_type?: "image/jpeg" | "image/png" | "image/webp";
          organization_id?: string;
          size_bytes?: number;
          storage_bucket?: "control-photos";
          storage_path?: string;
          updated_at?: string;
          uploaded_at?: string;
        };
      };
      controls: {
        Insert: {
          archived_at?: string | null;
          building_id: string;
          completed_at?: string | null;
          controlled_by: string;
          created_at?: string;
          deleted_at?: string | null;
          details_purged_at?: string | null;
          general_comment?: string | null;
          id: string;
          organization_id: string;
          photos_purged_at?: string | null;
          quality_rating?: Database["public"]["Enums"]["control_quality_rating"] | null;
          started_at: string;
          status?: Database["public"]["Enums"]["control_status"];
          updated_at?: string;
        };
        Relationships: [];
        Row: {
          archived_at: string | null;
          building_id: string;
          completed_at: string | null;
          controlled_by: string;
          created_at: string;
          deleted_at: string | null;
          details_purged_at: string | null;
          general_comment: string | null;
          id: string;
          organization_id: string;
          photos_purged_at: string | null;
          quality_rating: Database["public"]["Enums"]["control_quality_rating"] | null;
          started_at: string;
          status: Database["public"]["Enums"]["control_status"];
          updated_at: string;
        };
        Update: {
          archived_at?: string | null;
          building_id?: string;
          completed_at?: string | null;
          controlled_by?: string;
          created_at?: string;
          deleted_at?: string | null;
          details_purged_at?: string | null;
          general_comment?: string | null;
          id?: string;
          organization_id?: string;
          photos_purged_at?: string | null;
          quality_rating?: Database["public"]["Enums"]["control_quality_rating"] | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["control_status"];
          updated_at?: string;
        };
      };
      control_summaries: {
        Insert: {
          building_address?: string | null;
          building_id: string;
          building_name: string;
          checklist_result_count?: number;
          completed_at?: string | null;
          control_id: string;
          controlled_by: string;
          corrective_action_count?: number;
          created_at?: string;
          deleted_at?: string | null;
          general_comment?: string | null;
          id: string;
          non_compliant_result_count?: number;
          organization_id: string;
          photo_count?: number;
          quality_rating?: Database["public"]["Enums"]["control_quality_rating"] | null;
          sector: string;
          started_at: string;
          status: Database["public"]["Enums"]["control_status"];
          updated_at?: string;
        };
        Relationships: [];
        Row: {
          building_address: string | null;
          building_id: string;
          building_name: string;
          checklist_result_count: number;
          completed_at: string | null;
          control_id: string;
          controlled_by: string;
          corrective_action_count: number;
          created_at: string;
          deleted_at: string | null;
          general_comment: string | null;
          id: string;
          non_compliant_result_count: number;
          organization_id: string;
          photo_count: number;
          quality_rating: Database["public"]["Enums"]["control_quality_rating"] | null;
          sector: string;
          started_at: string;
          status: Database["public"]["Enums"]["control_status"];
          updated_at: string;
        };
        Update: {
          building_address?: string | null;
          building_id?: string;
          building_name?: string;
          checklist_result_count?: number;
          completed_at?: string | null;
          control_id?: string;
          controlled_by?: string;
          corrective_action_count?: number;
          created_at?: string;
          deleted_at?: string | null;
          general_comment?: string | null;
          id?: string;
          non_compliant_result_count?: number;
          organization_id?: string;
          photo_count?: number;
          quality_rating?: Database["public"]["Enums"]["control_quality_rating"] | null;
          sector?: string;
          started_at?: string;
          status?: Database["public"]["Enums"]["control_status"];
          updated_at?: string;
        };
      };
      corrective_actions: {
        Insert: {
          assigned_to?: string | null;
          building_id: string;
          control_id?: string | null;
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          id: string;
          organization_id: string;
          priority?: Database["public"]["Enums"]["priority_level"];
          resolved_at?: string | null;
          status?: Database["public"]["Enums"]["corrective_action_status"];
          title: string;
          updated_at?: string;
        };
        Relationships: [];
        Row: {
          assigned_to: string | null;
          building_id: string;
          control_id: string | null;
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          description: string | null;
          due_date: string | null;
          id: string;
          organization_id: string;
          priority: Database["public"]["Enums"]["priority_level"];
          resolved_at: string | null;
          status: Database["public"]["Enums"]["corrective_action_status"];
          title: string;
          updated_at: string;
        };
        Update: {
          assigned_to?: string | null;
          building_id?: string;
          control_id?: string | null;
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          description?: string | null;
          due_date?: string | null;
          id?: string;
          organization_id?: string;
          priority?: Database["public"]["Enums"]["priority_level"];
          resolved_at?: string | null;
          status?: Database["public"]["Enums"]["corrective_action_status"];
          title?: string;
          updated_at?: string;
        };
      };
      organization_members: {
        Insert: {
          created_at?: string;
          organization_id: string;
          role?: Database["public"]["Enums"]["member_role"];
          user_id: string;
        };
        Relationships: [];
        Row: {
          created_at: string;
          organization_id: string;
          role: Database["public"]["Enums"]["member_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          organization_id?: string;
          role?: Database["public"]["Enums"]["member_role"];
          user_id?: string;
        };
      };
      organizations: {
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          owner_id?: string | null;
          updated_at?: string;
          workspace_type?: Database["public"]["Enums"]["workspace_type"];
        };
        Relationships: [];
        Row: {
          created_at: string;
          id: string;
          name: string;
          owner_id: string | null;
          updated_at: string;
          workspace_type: Database["public"]["Enums"]["workspace_type"];
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          owner_id?: string | null;
          updated_at?: string;
          workspace_type?: Database["public"]["Enums"]["workspace_type"];
        };
      };
    };
    Views: Record<string, never>;
  };
};
