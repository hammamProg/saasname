import config from "@/config";
import { sendEmail } from "@/libs/resend";
import { WaitlistWelcomeEmail } from "@/emails/WaitlistWelcomeEmail";
import { WaitlistNotificationEmail } from "@/emails/WaitlistNotificationEmail";

export async function sendWaitlistWelcomeEmail(email: string) {
  return sendEmail({
    to: email,
    subject: `You're on the ${config.appName} waitlist`,
    react: WaitlistWelcomeEmail({ email }),
    replyTo: config.resend.supportEmail,
  });
}

export async function sendWaitlistNotificationEmail(email: string) {
  return sendEmail({
    to: config.resend.supportEmail,
    subject: `New waitlist signup: ${email}`,
    react: WaitlistNotificationEmail({ email }),
    replyTo: email,
  });
}
