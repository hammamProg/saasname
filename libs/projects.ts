import type { StepId } from "@/app/types";
import type { ProjectPaddlePlan } from "@/libs/paddle-plans";
import type {
  SupabaseAuthSchemaApplied,
  SupabaseAuthSchemaOptions,
} from "@/libs/supabase-auth-schema";

export type ResendDnsRecord = {
  record: string;
  name: string;
  type: string;
  value: string;
  priority?: number | null;
  ttl?: string;
  status?: string;
};

export type Project = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  slug: string;
  image_url: string | null;
  github_repo_url: string | null;
  github_repo_full_name: string | null;
  supabase_project_ref: string | null;
  supabase_project_url: string | null;
  supabase_anon_key: string | null;
  supabase_service_role_key: string | null;
  supabase_auth_callback_url: string | null;
  supabase_site_url: string | null;
  supabase_redirect_urls: string[];
  supabase_auth_configured: boolean;
  supabase_auth_schema_options: SupabaseAuthSchemaOptions;
  supabase_auth_schema_applied: SupabaseAuthSchemaApplied;
  google_oauth_client_id: string | null;
  google_oauth_client_secret: string | null;
  resend_domain: string | null;
  resend_region: string;
  resend_from_name: string | null;
  resend_support_email: string | null;
  resend_domain_id: string | null;
  resend_domain_status: string | null;
  resend_dns_records: ResendDnsRecord[];
  resend_domain_added: boolean;
  paddle_provisioned: boolean;
  paddle_client_token: string | null;
  paddle_api_key: string | null;
  paddle_webhook_secret: string | null;
  paddle_webhook_url: string | null;
  paddle_starter_price_id: string | null;
  paddle_pro_price_id: string | null;
  paddle_notification_setting_id: string | null;
  paddle_plans: ProjectPaddlePlan[];
  completed_steps: StepId[];
  created_at: string;
  updated_at: string;
};

export type ProjectSummary = Pick<
  Project,
  | "id"
  | "name"
  | "description"
  | "slug"
  | "github_repo_url"
  | "github_repo_full_name"
  | "supabase_project_ref"
  | "supabase_project_url"
  | "supabase_auth_configured"
  | "completed_steps"
  | "updated_at"
>;

export const PROJECT_NAME_MAX = 80;
export const PROJECT_DESCRIPTION_MAX = 500;
