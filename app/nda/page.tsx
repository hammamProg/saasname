import Link from "next/link";
import config from "@/config";
import { getSEOTags } from "@/libs/seo";
import LegalPage, { Section } from "@/components/LegalPage";
import PrintButton from "@/components/PrintButton";

export const metadata = getSEOTags({
  title: `Non-Disclosure Agreement | ${config.appName}`,
  description:
    "Our standing confidentiality undertaking covering every idea and name you submit.",
  canonicalUrlRelative: "/nda",
});

export default function NdaPage() {
  return (
    <LegalPage
      title="Non-Disclosure Agreement"
      updated="26 August 2026"
      intro={
        <>
          This is a standing undertaking from the operator of {config.appName} to
          every person who uses it. It takes effect the moment you submit an idea
          or a name — there is nothing to sign and nothing to request. For the
          plain-English version of how it is enforced, see{" "}
          <Link
            href="/confidentiality"
            className="font-semibold text-primary hover:underline"
          >
            Confidentiality
          </Link>
          .
        </>
      }
    >
      <div className="print:hidden">
        <PrintButton />
      </div>

      <Section heading="1. Parties">
        <p>
          This agreement is between the operator of {config.appName} at{" "}
          {config.domainName} (<strong>&ldquo;we&rdquo;</strong>,{" "}
          <strong>&ldquo;us&rdquo;</strong>) and any person or organisation that
          submits information to the service (<strong>&ldquo;you&rdquo;</strong>).
        </p>
      </Section>

      <Section heading="2. What is confidential">
        <p>
          <strong>Confidential Information</strong> means everything you submit
          to or receive from the service that is not public, including:
        </p>
        <ul>
          <li>product, business and project ideas you describe;</li>
          <li>candidate names, seed names and names you ask us to check;</li>
          <li>the reports produced for you, and their contents;</li>
          <li>the fact that you are considering any particular name.</li>
        </ul>
        <p>
          It does not include information that is already public, that you make
          public, that we already held without a duty of confidence, or that we
          receive from a third party who is free to disclose it.
        </p>
      </Section>

      <Section heading="3. Our undertaking">
        <p>We will:</p>
        <ul>
          <li>keep your Confidential Information confidential;</li>
          <li>
            use it only to operate the service for you — to generate names, run
            checks, produce your reports, and support your account;
          </li>
          <li>
            not sell, licence, publish or otherwise disclose it, except as
            section 4 permits;
          </li>
          <li>
            not use it to train machine-learning models, and not use it to build
            or pursue any product, name or business of our own;
          </li>
          <li>
            limit staff access to what is necessary to operate the service or to
            fix a fault you have reported, and bind anyone with such access to
            these obligations.
          </li>
        </ul>
      </Section>

      <Section heading="4. Permitted disclosures">
        <p>We disclose Confidential Information only:</p>
        <ul>
          <li>
            <strong>to the providers we need in order to answer your
            question.</strong> Checking availability requires sending the name
            to the registries, registers, stores and search services being
            checked, and generating names requires sending your idea description
            to the model that writes them. The complete list, and what each one
            receives, is published on the{" "}
            <Link
              href="/confidentiality"
              className="font-semibold text-primary hover:underline"
            >
              Confidentiality page
            </Link>
            . Each provider handles what it receives under its own terms;
          </li>
          <li>
            <strong>where you tell us to.</strong> Turning on sharing for a
            report is your instruction to publish that report to anyone holding
            the link;
          </li>
          <li>
            <strong>where the law requires it.</strong> If we are legally
            compelled to disclose, we will give you notice first unless we are
            prohibited from doing so, and disclose only what is required.
          </li>
        </ul>
      </Section>

      <Section heading="5. Security">
        <p>
          We apply access controls at the database level so that your reports
          are readable only by your account, and we transmit data over encrypted
          connections. No system is perfect; if we become aware of a breach
          affecting your Confidential Information we will tell you without undue
          delay.
        </p>
      </Section>

      <Section heading="6. Your data, and deletion">
        <p>
          Your Confidential Information remains yours. Nothing here transfers any
          intellectual property to us, and nothing here gives us any claim over a
          name you decide to use. On request we will delete your account and the
          ideas, names and reports associated with it. Backups made before a
          deletion request are overwritten in the ordinary course.
        </p>
      </Section>

      <Section heading="7. Term">
        <p>
          These obligations begin when you first submit Confidential Information
          and continue for five years after your account is closed, or for as
          long as the information remains confidential, whichever is longer.
        </p>
      </Section>

      <Section heading="8. Changes">
        <p>
          If we change this agreement we will publish the new version here with a
          new date. Information you submitted before a change remains protected
          by whichever version is more protective of you.
        </p>
      </Section>

      <Section heading="9. Contact">
        <p>
          Questions, deletion requests, or notice of a concern:{" "}
          <a
            href={`mailto:${config.supportEmail}`}
            className="font-semibold text-primary hover:underline"
          >
            {config.supportEmail}
          </a>
          .
        </p>
      </Section>

      <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
        This document is written to be read and relied on, but it is not legal
        advice, and it does not name a governing jurisdiction. If you need a
        countersigned NDA on your own paper for a specific engagement, write to
        us and we will sign one.
      </p>
    </LegalPage>
  );
}
