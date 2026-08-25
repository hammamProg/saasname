import { Resend } from "resend";
import type { ReactNode } from "react";
import config from "@/config";

const RESEND_DEV_FROM = "SaaSNa.me <onboarding@resend.dev>";

type SendEmailParams = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  react?: ReactNode;
  replyTo?: string;
  from?: string;
};

type SendEmailResult =
  | { success: true; id: string }
  | { success: false; error: string };

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new Resend(apiKey);
}

/** Resend sender — empty RESEND_FROM_EMAIL falls back to onboarding@resend.dev for local dev. */
export function getResendFromAddress(): string {
  const configured = process.env.RESEND_FROM_EMAIL?.trim();
  return configured || RESEND_DEV_FROM;
}

/**
 * Send a transactional email via the Resend API.
 */
export async function sendEmail({
  to,
  subject,
  text,
  html,
  react,
  replyTo,
  from,
}: SendEmailParams): Promise<SendEmailResult> {
  const resend = getResendClient();

  if (!resend) {
    console.log("[email] Skipped (RESEND_API_KEY not configured):", subject, to);
    return { success: false, error: "Resend is not configured" };
  }

  const primaryFrom = from ?? getResendFromAddress();

  const attempt = async (fromAddress: string) =>
    resend.emails.send({
      from: fromAddress,
      to,
      subject,
      text,
      html,
      react,
      replyTo: replyTo ?? config.resend.supportEmail,
    });

  let { data, error } = await attempt(primaryFrom);

  if (
    error &&
    primaryFrom !== RESEND_DEV_FROM &&
    /domain is invalid|not verified|invalid from/i.test(error.message)
  ) {
    console.warn(
      `[email] Sender "${primaryFrom}" failed (${error.message}). Retrying with ${RESEND_DEV_FROM}.`
    );
    ({ data, error } = await attempt(RESEND_DEV_FROM));
  }

  if (error) {
    console.error("[email] Resend error:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true, id: data!.id };
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}
