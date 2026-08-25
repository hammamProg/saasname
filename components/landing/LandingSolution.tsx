import {
  CreditCard,
  Database,
  LayoutDashboard,
  Layers,
  Lock,
  Mail,
  Search,
  Shield,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";
import { SectionHeader } from "@/components/landing/shared";

const features = [
  { icon: Layers, title: "Next.js Fullstack Architecture", desc: "App Router, API routes, and server components ready to scale." },
  { icon: Lock, title: "Supabase Authentication", desc: "Google OAuth and magic links with session management built in." },
  { icon: Database, title: "Production Database Setup", desc: "Postgres schema, migrations, and RLS policies configured." },
  { icon: CreditCard, title: "Paddle Payments", desc: "Checkout, webhooks, and subscription lifecycle handled." },
  { icon: Sparkles, title: "Stripe Support Coming Soon", desc: "Stripe integration path planned for flexible billing." },
  { icon: Mail, title: "Resend Email Infrastructure", desc: "Transactional emails and React email templates included." },
  { icon: Search, title: "SEO Optimized Pages", desc: "Metadata, sitemap, and schema markup out of the box." },
  { icon: Shield, title: "Protected Routes", desc: "Auth middleware and dashboard access control wired up." },
  { icon: LayoutDashboard, title: "User Dashboard", desc: "Beautiful dashboard shell with sidebar navigation." },
  { icon: Zap, title: "Subscription Management", desc: "Plans, checkout, and customer portal integration." },
  { icon: Mail, title: "Email Templates", desc: "Waitlist, magic link, and notification templates ready." },
  { icon: Wrench, title: "Admin Utilities", desc: "Setup guide, integrations panel, and launchpad workspace." },
];

export default function LandingSolution() {
  return (
    <section id="features" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="The solution"
          title="Everything You Need To Launch"
          subtitle="A complete SaaS foundation — not a tutorial project. Every integration is production-ready."
        />

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="glass-card glass-card-hover group p-6"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-teal/25 via-brand-mint/20 to-brand-gold/10 text-accent transition-transform group-hover:scale-110">
                <feature.icon size={20} />
              </div>
              <h3 className="mt-4 font-bold leading-snug">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{feature.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
