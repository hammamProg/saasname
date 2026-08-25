const config = {
  appName: "SaaSNa.me",
  appDescription:
    "Find a SaaS name that is actually free to use — checked across app stores, web search, social handles, trademarks, and domains.",
  domainName: "saasna.me",
  productionUrl: "https://saasna.me",
  supportEmail: "support@saasna.me",
  brand: {
    logo: "/brand/saasname-logo.png",
    logoOnDark: "/brand/saasname-logo-on-dark.png",
    logoAlt: "SaaSNa.me",
  },
  colors: {
    theme: "light",
    ink: "#021B42",
    violet: "#622EF8",
    indigo: "#3C3FEB",
    blue: "#008DF7",
    cyan: "#00BDFC",
    main: "#008DF7",
    accent: "#00BDFC",
  },
  auth: {
    loginUrl: "/auth/signin",
    callbackUrl: "/dashboard",
  },
  credits: {
    signupGrant: 5,
    perCandidate: 1,
    // No price strings here on purpose: amounts are read from Paddle at render
    // time (libs/paddle/prices.ts). A hardcoded label drifts the moment the
    // price is edited in the Paddle dashboard, and the customer is charged
    // Paddle's amount, not ours.
    packs: [
      {
        id: "starter",
        name: "Starter",
        credits: 25,
        priceId:
          process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_CREDITS_25?.trim() ?? "",
        description: "Enough to name and validate your first project.",
        features: [
          { name: "25 name searches" },
          { name: "USPTO trademark screening" },
          { name: "Domain availability" },
          { name: "Social handle checks" },
          { name: "Credits never expire" },
        ],
      },
      {
        id: "builder",
        name: "Builder",
        credits: 100,
        isFeatured: true,
        priceId:
          process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_CREDITS_100?.trim() ?? "",
        description: "For founders shipping several projects a year.",
        features: [
          { name: "100 name searches" },
          { name: "USPTO trademark screening" },
          { name: "Domain availability" },
          { name: "Social handle checks" },
          { name: "Credits never expire" },
          { name: "Priority support" },
        ],
      },
    ],
  },
  resend: {
    fromNoReply:
      process.env.RESEND_FROM_EMAIL?.trim() ||
      "SaaSNa.me <onboarding@resend.dev>",
    supportEmail: "support@saasna.me",
  },
  links: {
    twitter: "https://twitter.com/saasname",
    github: "https://github.com/hammamProg/saasname",
    support: `mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@saasna.me"}`,
    affiliates: "#",
    terms: "/tos",
    privacy: "/privacy-policy",
  },
};

export default config;
