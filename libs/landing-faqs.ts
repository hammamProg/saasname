/** Single source of truth for the landing FAQ. The page renders it, the
 *  JSON-LD publishes it, and /llms.txt quotes it, so the three can never
 *  drift. Answers stay inside what the product actually does today — an FAQ
 *  that over-promises is the most expensive copy on the site. */
export type Faq = { question: string; answer: string };

export const LANDING_FAQS: Faq[] = [
  {
    question: "Where does the data come from?",
    answer:
      "Nine public sources, pulled on their own schedule: Hacker News, GitHub, npm, PyPI, a curated set of engineering blogs and changelogs, arXiv, Hugging Face, Stack Overflow, and keyword search demand. Every signal is stored with a link back to the original, and every trend shows you those links.",
  },
  {
    question: "How early is \"early\"?",
    answer:
      "Earlier than a headline, later than a rumour. A topic can appear the same day a repo starts moving, but it stays at low confidence until an unrelated source confirms it. You see the early ones labelled as early signals rather than dressed up as certainties.",
  },
  {
    question: "Is this just an AI guessing?",
    answer:
      "No. The ranking is arithmetic on real counts — how many signals arrived, from how many independent sources, and how that changed against previous days. A language model is used for two narrow jobs: grouping signals that describe the same thing, and writing the one-sentence summary from the evidence titles. It never invents a number.",
  },
  {
    question: "How is this different from a keyword tool?",
    answer:
      "Keyword tools measure demand for a phrase you already thought of. Most early trends have no established phrase yet — they exist as a repo, a paper and a package that nobody has connected. This clusters those first and treats search volume as one confirming source among nine, not the starting point.",
  },
  {
    question: "What does it cost?",
    answer:
      "There is a free plan with no card and no trial timer: the full ranked feed, twelve personalised trends, and three follows, with the highest-scoring few held back. Pro is $29 a month (or $290 a year, two months free) and unlocks those, doubles the feed, and removes the follow limit.",
  },
  {
    question: "What exactly is behind the paywall?",
    answer:
      "The top-scoring trends at any moment. You still see the full ranked list on Free, and every trend you can see comes with its source evidence — we do not paywall citations. What Pro buys is the handful at the top, where the signal is strongest and acting early matters most.",
  },
  {
    question: "Can I tune what I see?",
    answer:
      "Yes. You choose interest categories during onboarding and can follow topics you want to track or hide ones you don't. Hidden topics stop appearing immediately. Alongside your personalised feed there's a deliberately unfiltered Rising Fast column, so your view never narrows to only what you already selected.",
  },
];
