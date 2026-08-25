export type Article = {
  slug: string;
  title: string;
  description: string;
  content: string;
  image: string;
  categories: string[];
  author: string;
  publishedAt: string;
};

export const articles: Article[] = [
  {
    slug: "supabase-waitlist-setup",
    title: "Supabase Waitlist: Save Emails in 5 Minutes",
    description:
      "Set up a leads table, connect your API route, and start collecting signups from your landing page.",
    content: `## Why a waitlist?

Before you launch, you need proof people want your product. A waitlist captures emails from your landing page and stores them in Supabase.

## Steps

1. Create a Supabase project
2. Run the migration in \`supabase/migrations/001_leads.sql\`
3. Add env vars to \`.env.local\`
4. Submit the form on your homepage

That's it — emails flow to your database automatically.`,
    image: "/docs/components/blog.jpg",
    categories: ["Database", "Setup"],
    author: "Marc Lou",
    publishedAt: "November 30",
  },
  {
    slug: "resend-transactional-emails",
    title: "Resend Emails Explained With a Real-World Example",
    description:
      "Send welcome emails, magic links, and notifications using the Resend API and ShipNow helpers.",
    content: `## Two ways to send

**SMTP** — used for magic login links via NextAuth.

**Resend API** — use \`sendEmail()\` in \`libs/resend.ts\` for everything else.

## Waitlist flow

When someone joins via \`ButtonLead\`, they get a welcome email and you get a notification at your support inbox.

Verify your domain in Resend before going to production.`,
    image: "/docs/components/featuresAccordion.jpg",
    categories: ["Email", "Setup"],
    author: "Marc Lou",
    publishedAt: "November 24",
  },
];

export function getArticle(slug: string) {
  return articles.find((a) => a.slug === slug);
}
