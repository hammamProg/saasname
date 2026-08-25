import config from "@/config";

type WaitlistWelcomeEmailProps = {
  email: string;
};

export function WaitlistWelcomeEmail({ email }: WaitlistWelcomeEmailProps) {
  return (
    <div
      style={{
        fontFamily: "Arial, Helvetica, sans-serif",
        lineHeight: 1.6,
        color: "#171717",
        maxWidth: "560px",
        margin: "0 auto",
        padding: "24px",
      }}
    >
      <h1 style={{ fontSize: "24px", marginBottom: "8px" }}>
        You&apos;re on the {config.appName} waitlist
      </h1>
      <p style={{ color: "#52525b", marginTop: 0 }}>
        Thanks for signing up with <strong>{email}</strong>. We&apos;ll email
        you when we launch.
      </p>
      <p style={{ color: "#52525b" }}>
        In the meantime, reply to this email if you have questions — we read
        every message.
      </p>
      <p style={{ color: "#a1a1aa", fontSize: "14px", marginTop: "32px" }}>
        — The {config.appName} team
      </p>
    </div>
  );
}
