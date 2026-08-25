type WaitlistNotificationEmailProps = {
  email: string;
};

export function WaitlistNotificationEmail({
  email,
}: WaitlistNotificationEmailProps) {
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
      <h1 style={{ fontSize: "20px", marginBottom: "8px" }}>
        New waitlist signup
      </h1>
      <p style={{ color: "#52525b", marginTop: 0 }}>
        <strong>{email}</strong> just joined your waitlist.
      </p>
    </div>
  );
}
