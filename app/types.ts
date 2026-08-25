import type { LucideIcon } from "lucide-react";

export type StepId =
  | "repo"
  | "supabase_project"
  | "google_oauth"
  | "supabase_auth"
  | "email_domain"
  | "email"
  | "payments"
  | "copy_env"
  | "deploy"
  | "domain"
  | "analytics"
  | "storage"
  | "mcp";

export type StepLink = {
  label: string;
  url: string;
};

export type Step = {
  id: StepId;
  title: string;
  icon: LucideIcon;
  logoUrl?: string;
  badge?: string;
  description: string;
  commands?: string[];
  links?: StepLink[];
  instructions: string;
};
