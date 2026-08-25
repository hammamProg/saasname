# Components

All FastShip landing components are built with **Tailwind CSS**, matching the [ShipFast Components docs](https://shipfa.st/docs/components).

Reference preview images are saved in `public/docs/components/` (sourced from shipfa.st).

**Live showcase:** [http://localhost:3000/components](http://localhost:3000/components)

---

## Component catalog

| Component | File | Reference image | Docs |
|-----------|------|-----------------|------|
| Header | `components/Header.tsx` | [header.jpg](../public/docs/components/header.jpg) | [Header](https://shipfa.st/docs/components/header) |
| Hero | `components/Hero.tsx` | [hero.jpg](../public/docs/components/hero.jpg) | [Hero](https://shipfa.st/docs/components/hero) |
| Problem | `components/Problem.tsx` | [problem.jpg](../public/docs/components/problem.jpg) | [Problem](https://shipfa.st/docs/components/problem) |
| WithWithout | `components/WithWithout.tsx` | [withWithout.jpg](../public/docs/components/withWithout.jpg) | [WithWithout](https://shipfa.st/docs/components/withwithout) |
| FeaturesListicle | `components/FeaturesListicle.tsx` | [featuresListicle.jpg](../public/docs/components/featuresListicle.jpg) | [Features Listicle](https://shipfa.st/docs/components/features-listicle) |
| FeaturesAccordion | `components/FeaturesAccordion.tsx` | [featuresAccordion.jpg](../public/docs/components/featuresAccordion.jpg) | [Features Accordion](https://shipfa.st/docs/components/features-accordion) |
| FeaturesGrid | `components/FeaturesGrid.tsx` | [featuresGrid.jpg](../public/docs/components/featuresGrid.jpg) | [Features Grid](https://shipfa.st/docs/components/features-grid) |
| CTA | `components/CTA.tsx` | [cta.jpg](../public/docs/components/cta.jpg) | [CTA](https://shipfa.st/docs/components/cta) |
| Pricing | `components/Pricing.tsx` | [pricing.jpg](../public/docs/components/pricing.jpg) | [Pricing](https://shipfa.st/docs/components/pricing) |
| FAQ | `components/FAQ.tsx` | [faq.jpg](../public/docs/components/faq.jpg) | [FAQ](https://shipfa.st/docs/components/faq) |
| Footer | `components/Footer.tsx` | [footer.jpg](../public/docs/components/footer.jpg) | Footer (see showcase) |
| ButtonLead | `components/ButtonLead.tsx` | [buttonLead.jpg](../public/docs/components/buttonLead.jpg) | Button Lead (see showcase) |
| ButtonCheckout | `components/ButtonCheckout.tsx` | [buttonCheckout.jpg](../public/docs/components/buttonCheckout.jpg) | Button Checkout (see showcase) |
| ButtonSignin | `components/ButtonSignin.tsx` | [buttonSignin.jpg](../public/docs/components/buttonSignin.jpg) | Button Sign-in (see showcase) |
| ButtonAccount | `components/ButtonAccount.tsx` | [buttonAccount.jpg](../public/docs/components/buttonAccount.jpg) | Button Account (see showcase) |
| ButtonGradient | `components/ButtonGradient.tsx` | [buttonGradient.jpg](../public/docs/components/buttonGradient.jpg) | Button Gradient (see showcase) |
| ButtonPopover | `components/ButtonPopover.tsx` | [buttonPopover.jpg](../public/docs/components/buttonPopover.jpg) | Button Popover (see showcase) |
| BetterIcon | `components/BetterIcon.tsx` | [betterIcon.jpg](../public/docs/components/betterIcon.jpg) | Better Icon (see showcase) |
| Tabs | `components/Tabs.tsx` | [tabs.jpg](../public/docs/components/tabs.jpg) | [Tabs](https://shipfa.st/docs/components/tabs) |
| Modal | `components/Modal.tsx` | [modal.jpg](../public/docs/components/modal.jpg) | [Modal](https://shipfa.st/docs/components/modal) |
| Rating | `components/Rating.tsx` | — | Rating (utility) |
| TestimonialSmall | `components/TestimonialSmall.tsx` | — | Testimonial Small |
| TestimonialSingle | `components/TestimonialSingle.tsx` | — | Testimonial Single |
| TestimonialTriple | `components/TestimonialTriple.tsx` | — | Testimonial Triple |
| TestimonialGrid | `components/TestimonialGrid.tsx` | — | Testimonial Grid |
| BlogPreview | `components/BlogPreview.tsx` | [blog.jpg](../public/docs/components/blog.jpg) | [Blog](https://shipfa.st/docs/components/blog) |

---

## Default landing page

`app/page.tsx` uses the standard ShipFast flow from [Ship in 5 minutes](./SHIP_IN_5_MINUTES.md):

```
Header → Hero → Problem → FeaturesAccordion → TestimonialTriple → Pricing → FAQ → CTA → Footer
```

---

## Themes & animations

From [ShipFast Components](https://shipfa.st/docs/components):

- **Theme:** set `config.colors.theme` and `config.colors.main` (primary purple `#570df8`)
- **Animations** in `app/globals.css`:
  - `animate-opacity`
  - `animate-wiggle`
  - `animate-appearFromRight`
  - `animate-popup`

ShipFast uses **daisyUI** for primitive UI. FastShip uses Tailwind-only equivalents (`btn-primary`, `card`, etc.) — install daisyUI later if you want 1:1 parity.

---

## Blog

Blog content lives in `app/blog/_assets/content.ts`. Pages:

- `/blog` — article list
- `/blog/[slug]` — article detail

Add articles by extending the `articles` array.

---

## Customization tips (from ShipFast docs)

| Component | Tip |
|-----------|-----|
| Header | Keep brand name small; always link to Pricing |
| Hero | Answer "why stay 10 seconds?" in the headline; verb-based CTA |
| Problem | Never mention your product — agitate the pain |
| WithWithout | Match each "without" line to a "with" line |
| FeaturesAccordion | 2–5 features; short titles; media optional |
| Pricing | Good-Better-Best strategy; feature one plan |
| FAQ | Cover objections (refunds, support, etc.) |
| CTA | Full-width background; highlight value |

---

## What's next

- [Ship in 5 minutes](./SHIP_IN_5_MINUTES.md)
- [Database](./DATABASE.md)
- [Emails](./EMAILS.md)
