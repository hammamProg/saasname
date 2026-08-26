"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ButtonLead from "@/components/ButtonLead";
import ButtonCheckout from "@/components/ButtonCheckout";
import ButtonSignin from "@/components/ButtonSignin";
import ButtonAccount from "@/components/ButtonAccount";
import ButtonGradient from "@/components/ButtonGradient";
import ButtonPopover from "@/components/ButtonPopover";
import BetterIcon from "@/components/BetterIcon";
import Tabs from "@/components/Tabs";
import Modal from "@/components/Modal";
import Rating from "@/components/Rating";
import TestimonialSmall from "@/components/TestimonialSmall";
import TestimonialSingle from "@/components/TestimonialSingle";
import TestimonialGrid from "@/components/TestimonialGrid";
import FeaturesListicle from "@/components/FeaturesListicle";
import FeaturesGrid from "@/components/FeaturesGrid";
import WithWithout from "@/components/WithWithout";
import Image from "next/image";

const previews = [
  "header", "hero", "problem", "withWithout", "featuresListicle", "featuresAccordion",
  "featuresGrid", "cta", "pricing", "faq", "footer", "buttonLead", "buttonCheckout",
  "buttonSignin", "buttonAccount", "buttonGradient", "buttonPopover", "betterIcon",
  "tabs", "modal", "blog",
] as const;

function ShowcaseBlock({
  title,
  image,
  children,
}: {
  title: string;
  image?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="border-b border-border bg-surface px-4 py-3">
        <h2 className="font-bold">{title}</h2>
      </div>
      {image && (
        <div className="relative border-b border-border bg-surface p-4">
          <p className="mb-2 text-xs font-medium uppercase text-muted">ShipFast reference</p>
          <Image
            src={`/docs/components/${image}.jpg`}
            alt={`${title} reference`}
            width={800}
            height={400}
            className="mx-auto rounded-lg border border-border"
          />
        </div>
      )}
      <div className="p-6">{children}</div>
    </section>
  );
}

export default function ComponentsShowcasePage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <Link href="/" className="text-sm font-medium text-primary hover:underline">
          ← Back to landing page
        </Link>
        <h1 className="section-heading mt-4 text-3xl font-extrabold">Component library</h1>
        <p className="mt-2 text-muted">
          All ShipFast components implemented here. Reference images from{" "}
          <a href="https://shipfa.st/docs/components" className="text-primary underline">
            shipfa.st/docs/components
          </a>
          .
        </p>

        <div className="mt-10 space-y-10">
          <ShowcaseBlock title="ButtonLead" image="buttonLead">
            <ButtonLead extraStyle="max-w-sm" />
          </ShowcaseBlock>

          <ShowcaseBlock title="ButtonCheckout" image="buttonCheckout">
            <ButtonCheckout />
          </ShowcaseBlock>

          <ShowcaseBlock title="ButtonSignin" image="buttonSignin">
            <ButtonSignin />
          </ShowcaseBlock>

          <ShowcaseBlock title="ButtonAccount" image="buttonAccount">
            <ButtonAccount />
          </ShowcaseBlock>

          <ShowcaseBlock title="ButtonGradient" image="buttonGradient">
            <ButtonGradient />
          </ShowcaseBlock>

          <ShowcaseBlock title="ButtonPopover" image="buttonPopover">
            <ButtonPopover />
          </ShowcaseBlock>

          <ShowcaseBlock title="BetterIcon" image="betterIcon">
            <BetterIcon size="lg">📣</BetterIcon>
          </ShowcaseBlock>

          <ShowcaseBlock title="Tabs" image="tabs">
            <Tabs />
          </ShowcaseBlock>

          <ShowcaseBlock title="Modal" image="modal">
            <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={() => setModalOpen(true)}>
              Open modal
            </button>
            <Modal isOpen={modalOpen} setIsOpen={setModalOpen} />
          </ShowcaseBlock>

          <ShowcaseBlock title="Rating">
            <Rating value={5} className="text-2xl" />
          </ShowcaseBlock>

          <ShowcaseBlock title="TestimonialSmall">
            <TestimonialSmall />
          </ShowcaseBlock>

          <ShowcaseBlock title="TestimonialSingle">
            <TestimonialSingle />
          </ShowcaseBlock>

          <ShowcaseBlock title="TestimonialGrid">
            <TestimonialGrid />
          </ShowcaseBlock>

          <ShowcaseBlock title="WithWithout" image="withWithout">
            <WithWithout />
          </ShowcaseBlock>

          <ShowcaseBlock title="FeaturesListicle" image="featuresListicle">
            <FeaturesListicle />
          </ShowcaseBlock>

          <ShowcaseBlock title="FeaturesGrid" image="featuresGrid">
            <FeaturesGrid />
          </ShowcaseBlock>
        </div>

        <p className="mt-12 text-center text-sm text-muted">
          Preview images: {previews.length} components documented
        </p>
      </main>
      <Footer />
    </>
  );
}
