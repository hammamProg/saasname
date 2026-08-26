export type Article = {
  slug: string;
  title: string;
  description: string;
  content: string;
  image: string;
  categories: string[];
  author: string;
  publishedAt: string;
};

export const articles: Article[] = [
  {
    slug: "check-a-saas-name-before-you-commit",
    title: "Six places to check a SaaS name before you commit",
    description:
      "The .com is the check everyone runs and the least conclusive one. Here is the full list, in the order that will actually save you.",
    content: `Most founders check one thing — is the .com free — and treat the answer as
the answer. It is the least conclusive of the six checks that matter, and it is
not the one that ends up costing money.

## 1. The trademark register

Run this first, not last. A live mark in your class is the only finding on this
list that can force a rename after launch, and it is the one people skip because
the search interfaces are unpleasant. Search the exact wordmark, and look at
whether anything live sits in a software class.

## 2. The app stores

Both of them, separately. The App Store and Google Play routinely disagree, and a
shipped app under your name is a problem whether or not you plan to ship one —
it means someone is already trading under it.

## 3. Domains, across more than the .com

A taken .com is not fatal; plenty of good companies run on .io, .ai or .dev. What
matters is the pattern. If every extension is taken, you are looking at a name
someone is actively holding, and you will be negotiating rather than registering.

## 4. Social handles

Only where the answer means something. Some platforms return the same response
for a taken handle and one that has never existed, which makes a check there
worthless. Where a 404 genuinely distinguishes the two, it is a fast signal.

## 5. Web search presence

A free domain means little if page one already belongs to somebody. Search the
exact phrase and ask whether you would be fighting for your own name.

## 6. How it reads out loud

The unglamorous one. Say it on a call, spell it for someone, type it from memory.
A name that needs spelling every time is a tax you pay forever.

## The order matters

Check the things that can force a rename before the things that are merely
inconvenient. Trademark and app stores first, domains and handles second,
aesthetics last — because a beautiful name with a live mark on it is not a
candidate, and finding that out in week one is free.`,
    image: "/docs/components/blog.jpg",
    categories: ["Naming"],
    author: "SaaSNa.me",
    publishedAt: "August 26",
  },
  {
    slug: "the-com-being-free-doesnt-mean-the-name-is",
    title: "The .com being free doesn't mean the name is",
    description:
      "An unregistered domain is one weak signal. Here is what it does not tell you, and what a rename actually costs.",
    content: `An unregistered .com feels like permission. It is not. It tells you one thing:
nobody has paid ten dollars for that string. It tells you nothing about whether
you can build a brand on it.

## What a free domain does not rule out

A live trademark. Trademarks are granted on use in a class of goods or services,
not on domain registration. Somebody can hold a mark on the exact word, ship
under it for years, and never register the .com.

An app already in the stores. App names are not unique and are not tied to
domains at all.

An established web presence. If a company ranks for the term and you do not, you
will spend years being the second result for your own name.

## What a rename actually costs

The domain is the cheap part. The expensive parts are the ones already pointing
at the old name: the logo, the app store listing and its reviews, the inbound
links, the integrations, the customers who bookmarked you, and the search
authority you spent a year accumulating. That is the bill for finding out late.

## The useful question

Not "is it available" but "can I defend it". A name where the .com is taken by a
parked page and everything else is clear is often a better bet than one where the
.com is free and there is a live mark in your class. The first is a negotiation.
The second is a rename.`,
    image: "/docs/components/blog.jpg",
    categories: ["Naming"],
    author: "SaaSNa.me",
    publishedAt: "August 26",
  },
];

export function getArticle(slug: string) {
  return articles.find((a) => a.slug === slug);
}
