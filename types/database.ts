/* Auto-generated database types for Supabase tables */

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
      evaluator_profiles: {
        Row: {
          id: string;
          user_id: string;
          credits: number;
          free_credit_used_this_month: boolean;
          free_credit_reset_month: number;
          free_credit_reset_year: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          credits?: number;
          free_credit_used_this_month?: boolean;
          free_credit_reset_month?: number;
          free_credit_reset_year?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          credits?: number;
          free_credit_used_this_month?: boolean;
          free_credit_reset_month?: number;
          free_credit_reset_year?: number;
          updated_at?: string;
        };
      };
      evaluator_reports: {
        Row: {
          id: string;
          user_id: string;
          report_data: Json;
          property_address: string | null;
          property_type: string | null;
          overall_verdict: string | null;
          file_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          report_data: Json;
          property_address?: string | null;
          property_type?: string | null;
          overall_verdict?: string | null;
          file_count?: number;
          created_at?: string;
        };
        Update: {
          report_data?: Json;
          property_address?: string | null;
          property_type?: string | null;
          overall_verdict?: string | null;
        };
      };
    };
  };
}
