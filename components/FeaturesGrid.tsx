const cards = [
  {
    title: "Collect user feedback",
    description: "Use your board to let users submit features they want.",
    className: "bg-primary text-white md:col-span-1",
    demo: (
      <div className="mt-4 rounded-xl bg-white/95 p-4 text-foreground">
        <p className="text-xs font-semibold uppercase text-muted">Suggest a feature</p>
        <p className="mt-2 rounded-lg border border-border px-3 py-2 text-sm">
          Notifications| 
        </p>
      </div>
    ),
  },
  {
    title: "Prioritize features",
    description: "Users upvote features they want. You know what to ship next.",
    className: "bg-surface md:col-span-2",
    demo: (
      <div className="mt-4 space-y-2">
        {[
          { title: "Add payments to the boilerplate", votes: 48 },
          { title: "Magic link auth", votes: 12 },
        ].map((item) => (
          <div key={item.title} className="flex items-center justify-between rounded-xl bg-card p-3 shadow-sm">
            <p className="text-sm font-medium">{item.title}</p>
            <span className="rounded-lg bg-primary px-2 py-1 text-xs font-bold text-white">
              ▲ {item.votes}
            </span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "Your brand, your board",
    description: "Customize your product with multiple themes.",
    className: "bg-card md:col-span-2",
    demo: (
      <div className="mt-4 flex gap-2">
        {["bg-primary", "bg-pink-500", "bg-teal-500"].map((color) => (
          <div key={color} className={`h-16 flex-1 rounded-xl ${color} opacity-90`} />
        ))}
      </div>
    ),
  },
  {
    title: "Discover new ideas",
    description: "Users can chat and discuss features.",
    className: "bg-surface-dark text-white md:col-span-1",
    demo: (
      <div className="mt-4 rounded-xl bg-slate-700 p-3 text-sm">
        <p>Can we have a custom domain?</p>
        <p className="mt-2 text-xs text-slate-400">Marc Lou · Sep 1, 2024</p>
      </div>
    ),
  },
];

export default function FeaturesGrid() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="section-heading text-center text-3xl font-extrabold sm:text-4xl">
          Features that convert
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-muted">
          Interactive demos in a responsive bento grid — each card up to 3 columns wide.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {cards.map((card) => (
            <div key={card.title} className={`rounded-2xl p-6 ${card.className}`}>
              <h3 className="font-bold">{card.title}</h3>
              <p className={`mt-2 text-sm ${card.className.includes("text-white") ? "text-slate-300" : "text-muted"}`}>
                {card.description}
              </p>
              {card.demo}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
