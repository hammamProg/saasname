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
  resend: {
    fromNoReply:
      process.env.RESEND_FROM_EMAIL?.trim() ||
      "SaaSNa.me <onboarding@resend.dev>",
    supportEmail: "support@saasna.me",
  },
  pricing: {
    plans: [
      {
        priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_STARTER?.trim() ?? "",
        name: "Starter",
        description: "Perfect for small projects",
        price: 79,
        priceAnchor: 99,
        features: [
          { name: "Next.js boilerplate" },
          { name: "User oauth" },
          { name: "Database" },
          { name: "Emails" },
        ],
      },
      {
        isFeatured: true,
        priceId: process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_PRO?.trim() ?? "",
        name: "Advanced",
        description: "You need more power",
        price: 99,
        priceAnchor: 149,
        features: [
          { name: "Next.js boilerplate" },
          { name: "User oauth" },
          { name: "Database" },
          { name: "Emails" },
          { name: "1 year of updates" },
          { name: "24/7 support" },
        ],
      },
    ],
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
