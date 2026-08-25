import type { StepId } from "@/app/types";

export function getResetStepWarning(stepId: StepId): string {
  switch (stepId) {
    case "repo":
      return "This removes the linked GitHub repository from this project. You can connect a different repo afterward.";
    case "supabase_project":
      return "This clears the Supabase project link, API keys, and auth configuration. Your Supabase project is not deleted from Supabase.";
    case "google_oauth":
      return "This clears saved Google credentials and resets Supabase auth setup until you re-enter them.";
    case "supabase_auth":
      return "This clears API keys and auth configuration for this project. Your Supabase project itself is not deleted.";
    case "email":
      return "This clears your sending domain, Resend registration, and DNS records for this project.";
    case "payments":
      return "This clears saved Paddle catalog IDs and credentials for this project. Resources in your Paddle account are not deleted.";
    default:
      return "This clears saved progress for this step so you can run it again.";
  }
}
