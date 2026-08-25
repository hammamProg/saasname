const testimonials = [
  { quote: "Shipped in a weekend", name: "Alex", initial: "A" },
  { quote: "Best boilerplate I've used", name: "Sam", initial: "S" },
  { quote: "Saved me 40+ hours", name: "Jordan", initial: "J" },
  { quote: "Worth every penny", name: "Riley", initial: "R" },
  { quote: "My go-to for new ideas", name: "Casey", initial: "C" },
  { quote: "Clean code, great docs", name: "Dana", initial: "D" },
];

export default function TestimonialGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {testimonials.map((item) => (
        <figure key={item.name} className="card p-5">
          <blockquote className="text-sm text-muted">&ldquo;{item.quote}&rdquo;</blockquote>
          <figcaption className="mt-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
              {item.initial}
            </div>
            <span className="text-sm font-semibold">{item.name}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
