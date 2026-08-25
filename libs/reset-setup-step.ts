import type { StepId } from "@/app/types";

export function buildResetStepUpdate(
  stepId: StepId,
  completedSteps: StepId[]
): Record<string, unknown> {
  const nextCompleted = completedSteps.filter((id) => id !== stepId);

  switch (stepId) {
    case "repo":
      return {
        github_repo_url: null,
        github_repo_full_name: null,
        completed_steps: nextCompleted,
      };
    case "supabase_project":
      return {
        supabase_project_ref: null,
        supabase_project_url: null,
        supabase_anon_key: null,
        supabase_service_role_key: null,
        supabase_auth_configured: false,
        supabase_auth_callback_url: null,
        supabase_site_url: null,
        supabase_redirect_urls: [],
        completed_steps: nextCompleted.filter(
          (id) => id !== "supabase_project" && id !== "supabase_auth"
        ),
      };
    case "google_oauth":
      return {
        google_oauth_client_id: null,
        google_oauth_client_secret: null,
        completed_steps: nextCompleted.filter(
          (id) => id !== "google_oauth" && id !== "supabase_auth"
        ),
      };
    case "supabase_auth":
      return {
        supabase_anon_key: null,
        supabase_service_role_key: null,
        supabase_auth_configured: false,
        supabase_auth_callback_url: null,
        supabase_site_url: null,
        supabase_redirect_urls: [],
        supabase_auth_schema_applied: {},
        completed_steps: nextCompleted.filter((id) => id !== "supabase_auth"),
      };
        case "email":
      return {
        resend_domain: null,
        resend_region: "us-east-1",
        resend_from_name: null,
        resend_support_email: null,
        resend_domain_id: null,
        resend_domain_status: null,
        resend_dns_records: [],
        resend_domain_added: false,
        completed_steps: nextCompleted.filter((id) => id !== "email_domain" && id !== "email"),
      };
    case "payments":
      return {
        paddle_provisioned: false,
        paddle_client_token: null,
        paddle_api_key: null,
        paddle_webhook_secret: null,
        paddle_webhook_url: null,
        paddle_starter_price_id: null,
        paddle_pro_price_id: null,
        paddle_notification_setting_id: null,
        paddle_plans: [],
        completed_steps: nextCompleted.filter((id) => id !== "payments"),
      };
    default:
      return {
        completed_steps: nextCompleted,
      };
  }
}

export function canResetSetupStep(
  stepId: StepId,
  project: {
    github_repo_url?: string | null;
    supabase_project_ref?: string | null;
    google_oauth_client_id?: string | null;
    google_oauth_client_secret?: string | null;
    supabase_auth_configured?: boolean;
    supabase_anon_key?: string | null;
    resend_domain?: string | null;
    resend_domain_added?: boolean;
    resend_domain_id?: string | null;
    paddle_provisioned?: boolean;
    completed_steps?: StepId[];
  }
): boolean {
  switch (stepId) {
    case "repo":
      return Boolean(project.github_repo_url);
    case "supabase_project":
      return Boolean(project.supabase_project_ref);
    case "google_oauth":
      return Boolean(project.google_oauth_client_id || project.google_oauth_client_secret);
    case "supabase_auth":
      return Boolean(
        project.supabase_auth_configured ||
          project.supabase_anon_key ||
          project.completed_steps?.includes("supabase_auth")
      );
case "email":
      return Boolean(
        project.resend_domain_added ||
          project.resend_domain_id ||
          project.completed_steps?.includes("email")
      );
    case "payments":
      return Boolean(
        project.paddle_provisioned || project.completed_steps?.includes("payments")
      );
    default:
      return Boolean(project.completed_steps?.includes(stepId));
  }
}
