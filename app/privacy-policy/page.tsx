import Link from "next/link";
import config from "@/config";
import { getSEOTags } from "@/libs/seo";
import LegalPage, { Section } from "@/components/LegalPage";

export const metadata = getSEOTags({
  title: `Privacy Policy | ${config.appName}`,
  description: "What we collect, why, who receives it, and how to have it deleted.",
  canonicalUrlRelative: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="26 August 2026"
      intro={
        <>
          The short version: we collect what the service needs to work, we do not
          sell it, and your ideas are covered by a separate{" "}
          <Link href="/nda" className="font-semibold text-primary hover:underline">
            NDA
          </Link>
          .
        </>
      }
    >
      <Section heading="What we collect">
        <ul>
          <li>
            <strong>Account</strong> — your email address, and your name and
            avatar if you sign in with Google.
          </li>
          <li>
            <strong>What you submit</strong> — idea descriptions, seed names, and
            the names you ask us to check.
          </li>
          <li>
            <strong>What we produce</strong> — candidate names, the results of
            each check, and the reports built from them.
          </li>
          <li>
            <strong>Credits</strong> — an append-only ledger of grants, spends and
            refunds.
          </li>
          <li>
            <strong>Technical</strong> — ordinary server logs from our host,
            including IP address and request metadata.
          </li>
        </ul>
        <p>
          We do not collect payment card details. Our payment processor acts as
          merchant of record and handles payment directly; we receive only the
          fact of a transaction and what it entitles you to.
        </p>
      </Section>

      <Section heading="Why we collect it">
        <p>
          To run the service you asked for: to authenticate you, generate names,
          run checks, produce and store your reports, meter credits, send
          transactional email, and keep the service secure and working. We do not
          use your data for advertising and we do not sell it.
        </p>
      </Section>

      <Section heading="Who receives it">
        <p>
          Every category of recipient, and exactly what each one receives, is
          listed on the{" "}
          <Link
            href="/confidentiality"
            className="font-semibold text-primary hover:underline"
          >
            Confidentiality page
          </Link>
          . That list is the authoritative one; we keep it current as part of
          changing the service, not as an afterthought.
        </p>
      </Section>

      <Section heading="How long we keep it">
        <p>
          Your account data and reports are kept until you delete your account.
          The credit ledger is append-only and retained for as long as your
          account exists, because it is the record of what you paid for and what
          you spent. Server logs are retained by our host on its own schedule.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>
          You can ask us for a copy of your data, ask us to correct it, or ask us
          to delete it. Deleting your account removes your ideas, names and
          reports. Write to{" "}
          <a
            href={`mailto:${config.supportEmail}`}
            className="font-semibold text-primary hover:underline"
          >
            {config.supportEmail}
          </a>{" "}
          and we will action it.
        </p>
        <p>
          Depending on where you live you may have additional rights under laws
          such as the GDPR or CCPA, including the right to object to processing
          and to complain to a supervisory authority.
        </p>
      </Section>

      <Section heading="Cookies">
        <p>
          We set the cookies needed to keep you signed in. We do not run
          advertising or cross-site tracking cookies.
        </p>
      </Section>

      <Section heading="Children">
        <p>The service is not intended for anyone under 16.</p>
      </Section>

      <Section heading="Changes">
        <p>
          If this policy changes we will publish the new version here with a new
          date.
        </p>
      </Section>

      <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
        This policy describes what the service actually does. It has not been
        reviewed by a lawyer, and it does not yet name a legal entity or a
        governing jurisdiction — both should be added before the service takes
        payments at scale.
      </p>
    </LegalPage>
  );
}
