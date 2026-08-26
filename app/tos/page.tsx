import Link from "next/link";
import config from "@/config";
import { getSEOTags } from "@/libs/seo";
import LegalPage, { Section } from "@/components/LegalPage";

export const metadata = getSEOTags({
  title: "Terms of Service",
  description:
    "The terms you agree to when using SaaSNa.me, including what the reports do and do not tell you.",
  canonicalUrlRelative: "/tos",
});

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="26 August 2026"
      intro={
        <>
          These terms cover your use of {config.appName}. The most important one
          is section 4: a report tells you what we found, not that a name is safe
          to use. Your ideas are covered separately by our{" "}
          <Link href="/nda" className="font-semibold text-primary hover:underline">
            NDA
          </Link>
          .
        </>
      }
    >
      <Section heading="1. The agreement">
        <p>
          By creating an account or using the service you agree to these terms.
          If you are using {config.appName} for an organisation, you confirm you
          may bind it. If you do not agree, do not use the service.
        </p>
      </Section>

      <Section heading="2. What the service does">
        <p>
          {config.appName} generates candidate names from a description you
          provide, and checks names against third-party sources: domain
          registries, the US trademark register, the Apple App Store, Google
          Play, certain social platforms, and web search. It returns what those
          sources reported, a verdict computed from those signals, and links to
          the underlying evidence.
        </p>
      </Section>

      <Section heading="3. Accounts">
        <p>
          You need an account to run checks. Keep your sign-in method secure; you
          are responsible for activity under your account. Provide accurate
          details, and tell us promptly if you believe your account has been
          accessed by someone else. You must be at least 16.
        </p>
      </Section>

      <Section heading="4. What a report is, and is not">
        <p>
          <strong>
            A report is a screening tool. It is not legal advice, not a
            trademark clearance opinion, and not a guarantee that a name is free
            to use.
          </strong>{" "}
          The decision to adopt a name is yours, and you are responsible for it.
        </p>
        <ul>
          <li>
            The trademark check covers live US records for the exact wordmark.
            It does not cover other jurisdictions, similar-but-not-identical
            marks, common-law rights, or whether a mark applies to your class of
            goods or services.
          </li>
          <li>
            A source that could not be reached is reported as unknown. Unknown
            never means available.
          </li>
          <li>
            Results are accurate only as at the moment they were read. Domain
            availability in particular changes minute to minute.
          </li>
          <li>
            Some platforms are deliberately not checked, because their responses
            do not distinguish a taken name from one that never existed.
          </li>
        </ul>
        <p>
          Before committing to a name commercially, consult a qualified
          trademark attorney. Nothing here substitutes for that.
        </p>
      </Section>

      <Section heading="5. Credits and payment">
        <p>
          Checks are paid for with credits. One credit checks one name across
          every source. Generating candidate names costs nothing.
        </p>
        <ul>
          <li>
            Credits are sold in one-time packs. They do not expire and nothing
            renews automatically.
          </li>
          <li>
            {config.credits.signupGrant} credits are granted on signup. Granted
            credits have no cash value and are not refundable.
          </li>
          <li>
            If a core check cannot be completed, the credit for that name is
            returned to your balance automatically.
          </li>
          <li>
            Payment is taken by our payment processor acting as merchant of
            record. Its terms govern the transaction, and tax is handled at
            checkout.
          </li>
        </ul>
        <p>
          Credits are digital goods made available immediately. If you have
          bought a pack and have not spent any of it, write to{" "}
          <a
            href={`mailto:${config.supportEmail}`}
            className="font-semibold text-primary hover:underline"
          >
            {config.supportEmail}
          </a>{" "}
          within 14 days and we will refund it. Once credits have been spent the
          work has been done and that spend is not refundable, except where the
          law says otherwise.
        </p>
      </Section>

      <Section heading="6. Acceptable use">
        <p>You agree not to:</p>
        <ul>
          <li>
            access the service by automated means, or resell, redistribute or
            systematically extract reports;
          </li>
          <li>
            attempt to circumvent credit metering, rate limits, or access
            controls;
          </li>
          <li>
            use the service to harass anyone, to infringe deliberately on
            someone&apos;s rights, or for any unlawful purpose;
          </li>
          <li>
            interfere with the service&apos;s operation or with other
            users&apos; access to it.
          </li>
        </ul>
      </Section>

      <Section heading="7. Your content and ours">
        <p>
          Your ideas, names and reports remain yours. We claim no ownership of
          them and no rights over any name you decide to use. You grant us only
          the permission needed to operate the service for you, as described in
          the{" "}
          <Link href="/nda" className="font-semibold text-primary hover:underline">
            NDA
          </Link>{" "}
          and the{" "}
          <Link
            href={config.links.privacy}
            className="font-semibold text-primary hover:underline"
          >
            privacy policy
          </Link>
          .
        </p>
        <p>
          The service itself — the software, the interface and the branding —
          remains ours.
        </p>
      </Section>

      <Section heading="8. Sharing a report">
        <p>
          Reports are private until you choose to share one. Turning on sharing
          creates a link that anyone holding it can read, and is your instruction
          to publish that report to them. You can revoke it at any time; we
          cannot recall what has already been read.
        </p>
      </Section>

      <Section heading="9. Availability">
        <p>
          We aim to keep the service running but do not promise uninterrupted
          availability. It depends on third-party sources that can be slow,
          rate-limited or unavailable, and we cannot control that. We may change
          or discontinue features; if we discontinue the service entirely we will
          give reasonable notice and refund unspent credits.
        </p>
      </Section>

      <Section heading="10. Liability">
        <p>
          The service is provided as is. To the extent the law allows, we exclude
          implied warranties, and we are not liable for indirect or consequential
          loss — including lost profits, lost opportunity, rebranding costs, or
          the outcome of a dispute over a name.
        </p>
        <p>
          Where we are liable, our total liability is limited to the greater of
          the amount you paid us in the twelve months before the claim, or
          US$100. Nothing here excludes liability that cannot lawfully be
          excluded.
        </p>
      </Section>

      <Section heading="11. Suspension and termination">
        <p>
          You may stop using the service and ask us to delete your account at any
          time. We may suspend or close an account that breaches these terms, or
          where required by law. If we close your account without cause, we will
          refund unspent credits.
        </p>
      </Section>

      <Section heading="12. Changes">
        <p>
          We may update these terms. Material changes will be published here with
          a new date, and continuing to use the service after that means you
          accept them. If you do not, stop using the service and ask us to refund
          any unspent credits.
        </p>
      </Section>

      <Section heading="13. Contact">
        <p>
          <a
            href={`mailto:${config.supportEmail}`}
            className="font-semibold text-primary hover:underline"
          >
            {config.supportEmail}
          </a>
        </p>
      </Section>

      <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
        These terms describe how the service actually works, but they have not
        been reviewed by a lawyer and they name no legal entity or governing
        jurisdiction. Both should be added before the service takes payments at
        scale — particularly the liability cap in section 10 and the refund
        position in section 5, which interact with consumer law that varies by
        country.
      </p>
    </LegalPage>
  );
}
