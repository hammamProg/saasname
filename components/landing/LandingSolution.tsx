import {
  AtSign,
  Apple,
  FileText,
  Globe,
  History,
  Play,
  Scale,
  Search,
  Share2,
  Sparkles,
  Wand2,
  Wallet,
} from "lucide-react";
import { SectionHeader } from "@/components/landing/shared";

const features = [
  {
    icon: Wand2,
    title: "Names from your idea",
    desc: "Describe the product in a sentence and get 5–8 candidates. Generating is free — you only spend credits on checking.",
  },
  {
    icon: Globe,
    title: "Domains via RDAP",
    desc: ".com, .io, .ai, .dev and .app queried against the registries themselves — not a reseller's upsell page.",
  },
  {
    icon: Scale,
    title: "US trademark screening",
    desc: "Live marks on the USPTO register surfaced before you print stickers.",
  },
  {
    icon: Apple,
    title: "App Store",
    desc: "Existing iOS apps trading under the same name.",
  },
  {
    icon: Play,
    title: "Google Play",
    desc: "The Android listing everyone forgets to look at.",
  },
  {
    icon: AtSign,
    title: "Social handles",
    desc: "GitHub, X, and LinkedIn — only where a 404 genuinely means free.",
  },
  {
    icon: Search,
    title: "Web presence",
    desc: "Who already ranks for the name, and how strongly.",
  },
  {
    icon: Sparkles,
    title: "One verdict per name",
    desc: "Signals roll up into clear, caution, or taken — plus a score you can sort by.",
  },
  {
    icon: FileText,
    title: "Plain-English explanation",
    desc: "Why a name scored the way it did, written from the evidence, not from vibes.",
  },
  {
    icon: Share2,
    title: "Shareable reports",
    desc: "Opt in to a public link when you want a co-founder or lawyer to weigh in.",
  },
  {
    icon: History,
    title: "Search history",
    desc: "Every report you have run stays available. Names you rejected stay rejected for a reason.",
  },
  {
    icon: Wallet,
    title: "Credits, not a subscription",
    desc: "One credit per candidate checked. Buy a pack, use it whenever. Nothing renews.",
  },
];

export default function LandingSolution() {
  return (
    <section id="features" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeader
          badge="What you get"
          title="Six Sources. One Report."
          subtitle="Every check links to the evidence it came from, so a verdict is something you can verify rather than something you have to trust."
        />

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="glass-card glass-card-hover group p-6"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary transition-transform group-hover:scale-110">
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
