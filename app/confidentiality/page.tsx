import Link from "next/link";
import { Database, Eye, Lock, Share2 } from "lucide-react";
import config from "@/config";
import { getSEOTags } from "@/libs/seo";
import LegalPage, { Section } from "@/components/LegalPage";

export const metadata = getSEOTags({
  title: `Confidentiality | ${config.appName}`,
  description:
    "How your ideas and name reports are kept private, and exactly what leaves our systems.",
  canonicalUrlRelative: "/confidentiality",
});

/**
 * Recipients by category, not by vendor.
 *
 * Naming the sources we check is the product — a buyer needs to know a claim
 * about .com came from the registry and not from a guess. Naming the suppliers
 * behind our own infrastructure is not; it tells a reader nothing about how
 * their idea is treated and everything about how the service is built.
 * Describing recipients by category is an accepted form of this disclosure.
 */
const RECIPIENTS = [
  {
    who: "Our database and sign-in provider",
    what: "Your account, ideas, candidate names and reports",
    why: "Stores your work and keeps you signed in. Access is restricted to your account at the database level.",
  },
  {
    who: "The model that writes names",
    what: "Your idea description, and candidate names",
    why: "Turns your description into candidates, and writes the one-sentence summary on each report.",
  },
  {
    who: "Domain registries",
    what: "Candidate names only",
    why: "Availability for .com, .io, .ai, .dev and .app, answered by the registries themselves.",
  },
  {
    who: "The US trademark register",
    what: "Candidate names only",
    why: "Live records for the exact wordmark.",
  },
  {
    who: "The Apple App Store and Google Play",
    what: "Candidate names only",
    why: "Apps already trading under the name.",
  },
  {
    who: "GitHub, X and LinkedIn",
    what: "Candidate names only",
    why: "Whether the handle is free.",
  },
  {
    who: "Our web search provider",
    what: "Candidate names only",
    why: "Who already ranks for the name.",
  },
  {
    who: "Our payment processor",
    what: "Your email and payment details",
    why: "Takes payment as merchant of record. We never see or store your card.",
  },
  {
    who: "Our email and hosting providers",
    what: "Your email address, and ordinary request logs",
    why: "Sign-in links, account email, and running the site.",
  },
];

const GUARANTEES = [
  {
    icon: Lock,
    title: "Only you can read your reports",
    body: "Access is enforced by the database itself, not by application code that could be bypassed. A query for someone else's report returns nothing.",
  },
  {
    icon: Share2,
    title: "Private by default",
    body: "Sharing is off until you turn it on, per report. A shared link is revocable and marked noindex, so it never enters a search engine.",
  },
  {
    icon: Eye,
    title: "We do not read, sell, or train on your ideas",
    body: "Your ideas are not marketing material, not a dataset, and not for sale. Staff access is limited to what is needed to fix a fault you have reported.",
  },
  {
    icon: Database,
    title: "Deleted means deleted",
    body: "Ask us to delete your account and your ideas, names and reports go with it. Deletion cascades in the database.",
  },
];

export default function ConfidentialityPage() {
  return (
    <LegalPage
      title="Your ideas stay yours"
      updated="26 August 2026"
      intro={
        <>
          You are about to type an unlaunched product idea into someone else&apos;s
          website. That deserves a straight answer about where it goes, so this
          page names every system that touches it — and{" "}
          <Link href="/nda" className="font-semibold text-primary hover:underline">
            our NDA
          </Link>{" "}
          puts the commitment in writing.
        </>
      }
    >
      <section className="grid gap-4 sm:grid-cols-2">
        {GUARANTEES.map((item) => (
          <div key={item.title} className="card p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
              <item.icon size={18} aria-hidden="true" />
            </span>
            <h2 className="mt-3 font-bold">{item.title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.body}</p>
          </div>
        ))}
      </section>

      <Section heading="What leaves our systems, and when">
        <p>
          Checking whether a name is free means asking the places that would
          know. There is no way to do that without sending them the name. So the
          honest position is not &ldquo;nothing leaves&rdquo; — it is that you
          should know exactly what does.
        </p>
        <ul>
          <li>
            <strong>Your idea description</strong> is sent to one place: the
            model that writes candidate names, and only at the moment you press
            Generate. If you paste names you already have instead, no idea
            description is ever collected.
          </li>
          <li>
            <strong>Candidate names</strong> are sent to the registries,
            registers, stores and search engines being checked. Each of those
            sees a name, never your idea, never your identity.
          </li>
          <li>
            <strong>Nothing else.</strong> We do not send your ideas to
            analytics, advertising, or any third party not listed below.
          </li>
        </ul>
      </Section>

      <Section heading="Who receives what">
        <div className="not-prose overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/60">
                <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                  Recipient
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                  Receives
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-foreground">
                  Why
                </th>
              </tr>
            </thead>
            <tbody>
              {RECIPIENTS.map((row) => (
                <tr key={row.who} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-semibold text-foreground">{row.who}</td>
                  <td className="px-4 py-3">{row.what}</td>
                  <td className="px-4 py-3">{row.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm">
          Each recipient handles what it receives under its own terms. We choose
          them and we are answerable for that choice — but we cannot promise you
          what a third party has not promised us, so we do not. Named suppliers
          are available to customers on request.
        </p>
      </Section>

      <Section heading="How access is actually enforced">
        <p>
          Claims about privacy are cheap; the question is what enforces them.
          Reports, candidate names and individual checks each carry a database
          rule restricting them to the account that created them. That rule runs
          below the application, so a bug in our code cannot hand you someone
          else&apos;s report.
        </p>
        <p>
          Sharing requires two separate conditions to be true at once — the
          report marked public <em>and</em> a share token issued. Neither on its
          own exposes anything, so a single mistaken write cannot leak a report.
        </p>
      </Section>

      <Section heading="If you want it in writing">
        <p>
          <Link href="/nda" className="font-semibold text-primary hover:underline">
            Read the NDA
          </Link>
          . It is a standing confidentiality undertaking from us to you, and it
          applies to every idea and name you put into {config.appName}. You do
          not need to ask for it or sign anything.
        </p>
        <p>
          Questions, or a deletion request:{" "}
          <a
            href={`mailto:${config.supportEmail}`}
            className="font-semibold text-primary hover:underline"
          >
            {config.supportEmail}
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
