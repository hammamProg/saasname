const items = [
  {
    quote: "This cuts the BS. I shipped my first SaaS in 3 weeks.",
    name: "Matthieu",
    role: "Built fuelthegains.com",
    initial: "M",
  },
  {
    quote: "Exactly what you need to build a small SaaS. No fluff.",
    name: "Adsy",
    role: "Built indielaunch.ch",
    initial: "A",
  },
  {
    quote: "From knowing nothing to writing JavaScript and launching.",
    name: "Juan",
    role: "Built nerdmask.com",
    initial: "J",
  },
];

export default function TestimonialTriple() {
  return (
    <section id="testimonials" className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {items.map((item) => (
            <figure key={item.name} className="card p-6">
              <blockquote className="leading-relaxed text-muted">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft font-bold text-primary">
                  {item.initial}
                </div>
                <div>
                  <p className="font-bold">{item.name}</p>
                  <p className="text-sm text-muted">{item.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
