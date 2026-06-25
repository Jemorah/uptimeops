// ═══════════════════════════════════════════════════════════════
// SUPABASE DATABASE TYPES
// Generated via: npm run supabase:types
// ═══════════════════════════════════════════════════════════════

export type Database = {
  public: {
    Tables: {
      customers: {
        Row: {
          id: string;
          email: string;
          company_name: string | null;
          website: string | null;
          phone: string | null;
          plan: string;
          status: string;
          mrr: number;
          created_at: string;
          updated_at: string;
          churn_risk_score: number | null;
          churn_risk_reasons: string[] | null;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      subscriptions: {
        Row: {
          id: string;
          customer_id: string;
          stripe_subscription_id: string | null;
          status: string;
          plan: string;
          incidents_used_this_period: number;
          incidents_allowance: number;
          current_period_start: string | null;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      credentials_vault: {
        Row: {
          id: string;
          customer_id: string;
          encrypted_payload: string;
          public_key_fingerprint: string;
          expires_at: string;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      incidents: {
        Row: {
          id: string;
          customer_id: string;
          source_type: string;
          source_id: string | null;
          status: string;
          priority: string;
          title: string;
          website_url: string | null;
          ai_confidence: number | null;
          assigned_engineer: string | null;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      one_time_fixes: {
        Row: {
          id: string;
          customer_id: string;
          payment_intent_id: string | null;
          status: string;
          amount_paid: number | null;
          retry_count: number;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      vm_sessions: {
        Row: {
          id: string;
          incident_id: string | null;
          provider_vm_id: string | null;
          ip_address: string | null;
          status: string;
          created_at: string;
          destroyed_at: string | null;
          destroy_reason: string | null;
          error_message: string | null;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      audit_logs: {
        Row: {
          id: string;
          table_name: string | null;
          record_id: string | null;
          operation: string | null;
          performed_by_type: string;
          performed_by_id: string | null;
          old_values: Record<string, unknown> | null;
          new_values: Record<string, unknown> | null;
          metadata: Record<string, unknown> | null;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      human_escalations: {
        Row: {
          id: string;
          incident_id: string | null;
          fix_id: string | null;
          trigger: string;
          reason: string;
          assigned_engineer_id: string | null;
          status: string;
          created_at: string;
          assigned_at: string | null;
          reassigned_at: string | null;
          metadata: Record<string, unknown> | null;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      notifications: {
        Row: {
          id: string;
          customer_id: string | null;
          type: string;
          message: string;
          metadata: Record<string, unknown> | null;
          read: boolean;
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      pipeline_states: {
        Row: {
          pipeline_id: string;
          incident_id: string | null;
          fix_id: string | null;
          current_step: string;
          step_results: Record<string, unknown>;
          confidence: number;
          status: string;
          started_at: string;
          updated_at: string;
          error_count: number;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      deployment_snapshots: {
        Row: {
          id: string;
          incident_id: string | null;
          vm_session_id: string | null;
          status: string;
          created_at: string;
          used_at: string | null;
          rollback_reason: string | null;
          metadata: Record<string, unknown> | null;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: 'customer' | 'engineer' | 'coordinator' | 'admin';
          created_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      engineer_profiles: {
        Row: {
          id: string;
          name: string | null;
          email: string | null;
          phone: string | null;
          level: string | null;
          is_on_call: boolean;
          active_incident_count: number;
          last_heartbeat_at: string | null;
          last_assigned_at: string | null;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      coordinator_profiles: {
        Row: {
          id: string;
          phone: string | null;
          email: string | null;
          is_lead: boolean;
          can_rollback: boolean;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      communications_log: {
        Row: {
          id: string;
          customer_id: string | null;
          type: string;
          channel: string;
          entity_type: string;
          entity_id: string;
          subject: string;
          body: string;
          metadata: Record<string, unknown> | null;
          sent_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      temporary_links: {
        Row: {
          id: string;
          token_hash: string;
          entity_type: string;
          entity_id: string;
          customer_id: string;
          expires_at: string;
          access_count: number;
          status: string;
          created_at: string;
          revoked_at: string | null;
          last_accessed_at: string | null;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      churn_events: {
        Row: {
          id: string;
          stripe_subscription_id: string;
          churned_at: string;
          reason: string;
          feedback: string | null;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      smoke_tests: {
        Row: {
          id: string;
          vm_session_id: string;
          incident_id: string | null;
          pipeline_id: string | null;
          results: Record<string, unknown>;
          overall_passed: boolean;
          run_at: string;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
      vm_commands: {
        Row: {
          id: string;
          vm_session_id: string;
          command: string;
          status: string;
          output: string | null;
          exit_code: number | null;
          started_at: string | null;
          completed_at: string | null;
        };
        Insert: Record<string, unknown>;
        Update: Record<string, unknown>;
      };
    };
    Enums: Record<string, never>;
    Functions: Record<string, never>;
  };
};
