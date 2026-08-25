const config = {
  appName: "ShipNow",
  appDescription:
    "Production-ready SaaS starter kit with authentication, payments, emails, database, SEO, and deployment workflows already configured. Launch in days, not months.",
  domainName: "shipnow.vip",
  productionUrl: "https://shipnow.vip",
  supportEmail: "support@shipnow.vip",
  brand: {
    logo: "/brand/shipnow-logo.png",
    logoAlt: "ShipNow",
  },
  colors: {
    theme: "light",
    navy: "#06202B",
    teal: "#077A7D",
    mint: "#7AE2CF",
    gold: "#FDEB9E",
    main: "#077A7D",
    accent: "#7AE2CF",
  },
  auth: {
    loginUrl: "/auth/signin",
    callbackUrl: "/dashboard",
  },
  resend: {
    fromNoReply:
      process.env.RESEND_FROM_EMAIL?.trim() ||
      "ShipNow <onboarding@resend.dev>",
    supportEmail: "support@shipnow.vip",
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
    twitter: "https://twitter.com/shipnow",
    github: "https://github.com/hammamProg/fastship",
    support: `mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@shipnow.vip"}`,
    affiliates: "#",
    terms: "/tos",
    privacy: "/privacy-policy",
  },
};

export default config;
