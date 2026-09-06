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
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          company_id: string
          content: string
          created_at: string
          created_by: string
          id: string
          project_id: string | null
          target_role: Database["public"]["Enums"]["app_role"] | null
          title: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          created_by: string
          id?: string
          project_id?: string | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          title: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          project_id?: string | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          logo_url: string | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string
          logo_url?: string | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      company_memberships: {
        Row: {
          company_id: string
          created_at: string
          department: Database["public"]["Enums"]["department"] | null
          id: string
          is_active: boolean
          reports_to: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          department?: Database["public"]["Enums"]["department"] | null
          id?: string
          is_active?: boolean
          reports_to?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          department?: Database["public"]["Enums"]["department"] | null
          id?: string
          is_active?: boolean
          reports_to?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      document_annotations: {
        Row: {
          content: string
          created_at: string
          document_id: string
          highlight_text: string | null
          id: string
          page_number: number | null
          position_x: number | null
          position_y: number | null
          user_id: string
          user_name: string | null
        }
        Insert: {
          content: string
          created_at?: string
          document_id: string
          highlight_text?: string | null
          id?: string
          page_number?: number | null
          position_x?: number | null
          position_y?: number | null
          user_id: string
          user_name?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          document_id?: string
          highlight_text?: string | null
          id?: string
          page_number?: number | null
          position_x?: number | null
          position_y?: number | null
          user_id?: string
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_annotations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          company_id: string
          created_at: string
          description: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          project_id: string | null
          status: string
          submitted_by: string
          submitted_by_name: string | null
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          project_id?: string | null
          status?: string
          submitted_by: string
          submitted_by_name?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          project_id?: string | null
          status?: string
          submitted_by?: string
          submitted_by_name?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          company_id: string
          created_at: string
          department: Database["public"]["Enums"]["department"] | null
          email: string
          id: string
          invited_by: string
          responded_at: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: string
          team_lead_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          department?: Database["public"]["Enums"]["department"] | null
          email: string
          id?: string
          invited_by: string
          responded_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          team_lead_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          department?: Database["public"]["Enums"]["department"] | null
          email?: string
          id?: string
          invited_by?: string
          responded_at?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
          team_lead_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          company_id: string
          content: string
          created_at: string
          id: string
          is_read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          reference_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          department: Database["public"]["Enums"]["department"] | null
          email: string
          id: string
          job_title: string | null
          name: string
          phone: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department"] | null
          email: string
          id?: string
          job_title?: string | null
          name: string
          phone?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department"] | null
          email?: string
          id?: string
          job_title?: string | null
          name?: string
          phone?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          id: string
          joined_at: string
          project_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          project_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          project_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          company_id: string
          created_at: string
          department: Database["public"]["Enums"]["department"]
          description: string | null
          due_date: string
          id: string
          lead_id: string | null
          lead_name: string | null
          name: string
          progress: number
          review_feedback: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["project_status"]
          submission_comment: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          department: Database["public"]["Enums"]["department"]
          description?: string | null
          due_date: string
          id?: string
          lead_id?: string | null
          lead_name?: string | null
          name: string
          progress?: number
          review_feedback?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          submission_comment?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          department?: Database["public"]["Enums"]["department"]
          description?: string | null
          due_date?: string
          id?: string
          lead_id?: string | null
          lead_name?: string | null
          name?: string
          progress?: number
          review_feedback?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["project_status"]
          submission_comment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      task_submissions: {
        Row: {
          attempt_number: number
          comment: string | null
          created_at: string
          id: string
          submission_file_url: string | null
          submission_type: string
          submission_url: string | null
          submitted_by: string
          task_id: string
        }
        Insert: {
          attempt_number?: number
          comment?: string | null
          created_at?: string
          id?: string
          submission_file_url?: string | null
          submission_type: string
          submission_url?: string | null
          submitted_by: string
          task_id: string
        }
        Update: {
          attempt_number?: number
          comment?: string | null
          created_at?: string
          id?: string
          submission_file_url?: string | null
          submission_type?: string
          submission_url?: string | null
          submitted_by?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_by: string | null
          assigned_to: string | null
          assignee_name: string | null
          company_id: string
          created_at: string
          description: string | null
          due_date: string
          id: string
          project_id: string | null
          review_feedback: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["task_status"]
          submission_file_url: string | null
          submission_type: string | null
          submission_url: string | null
          title: string
        }
        Insert: {
          assigned_by?: string | null
          assigned_to?: string | null
          assignee_name?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          project_id?: string | null
          review_feedback?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          submission_file_url?: string | null
          submission_type?: string | null
          submission_url?: string | null
          title: string
        }
        Update: {
          assigned_by?: string | null
          assigned_to?: string | null
          assignee_name?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          project_id?: string | null
          review_feedback?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          submission_file_url?: string | null
          submission_type?: string | null
          submission_url?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          department: Database["public"]["Enums"]["department"] | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          department?: Database["public"]["Enums"]["department"] | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          department?: Database["public"]["Enums"]["department"] | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_reviews: {
        Row: {
          action: string
          actor_id: string | null
          comment: string
          company_id: string
          created_at: string
          id: string
          project_id: string | null
          task_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          comment?: string
          company_id: string
          created_at?: string
          id?: string
          project_id?: string | null
          task_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          comment?: string
          company_id?: string
          created_at?: string
          id?: string
          project_id?: string | null
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_reviews_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_company_member: {
        Args: {
          _company_id: string
          _target_department?: Database["public"]["Enums"]["department"]
          _target_role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      close_company_workspace: {
        Args: { _company_id: string }
        Returns: undefined
      }
      create_company: {
        Args: {
          _department?: Database["public"]["Enums"]["department"]
          _name: string
          _role?: Database["public"]["Enums"]["app_role"]
        }
        Returns: {
          created_at: string
          id: string
          invite_code: string
          logo_url: string | null
          name: string
        }
        SetofOptions: {
          from: "*"
          to: "companies"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_user_department: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["department"]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_company_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      join_workplace: { Args: { _invite_code: string }; Returns: Json }
      leave_workspace: { Args: { _company_id: string }; Returns: undefined }
      project_has_department: {
        Args: {
          _department: Database["public"]["Enums"]["department"]
          _project_id: string
        }
        Returns: boolean
      }
      remove_company_member: {
        Args: { _company_id: string; _target_user_id: string }
        Returns: undefined
      }
      respond_work_invitation: {
        Args: { _accept: boolean; _invitation_id: string }
        Returns: string
      }
      transfer_role_to_member: {
        Args: { _company_id: string; _target_user_id: string }
        Returns: undefined
      }
      update_project_workflow: {
        Args: { _project_id: string; _updates: Json }
        Returns: {
          company_id: string
          created_at: string
          department: Database["public"]["Enums"]["department"]
          description: string | null
          due_date: string
          id: string
          lead_id: string | null
          lead_name: string | null
          name: string
          progress: number
          review_feedback: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["project_status"]
          submission_comment: string | null
        }
        SetofOptions: {
          from: "*"
          to: "projects"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_task_workflow: {
        Args: { _task_id: string; _updates: Json }
        Returns: {
          assigned_by: string | null
          assigned_to: string | null
          assignee_name: string | null
          company_id: string
          created_at: string
          description: string | null
          due_date: string
          id: string
          project_id: string | null
          review_feedback: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["task_status"]
          submission_file_url: string | null
          submission_type: string | null
          submission_url: string | null
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "tasks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      user_has_tasks_in_project: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "project_lead" | "team_lead" | "member"
      department: "tech" | "marketing" | "research"
      project_status:
        | "assigned"
        | "in_progress"
        | "complete"
        | "pending_approval"
        | "need_revision"
      task_status:
        | "declined"
        | "approved"
        | "unchecked"
        | "incomplete"
        | "in_progress"
        | "pending_approval"
        | "need_revision"
        | "completed"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["project_lead", "team_lead", "member"],
      department: ["tech", "marketing", "research"],
      project_status: [
        "assigned",
        "in_progress",
        "complete",
        "pending_approval",
        "need_revision",
      ],
      task_status: [
        "declined",
        "approved",
        "unchecked",
        "incomplete",
        "in_progress",
        "pending_approval",
        "need_revision",
        "completed",
      ],
    },
  },
} as const

