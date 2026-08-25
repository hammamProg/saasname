import Rating from "@/components/Rating";

export default function TestimonialSmall() {
  return (
    <div className="inline-flex max-w-sm items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
        J
      </div>
      <div>
        <Rating value={5} className="text-sm" />
        <p className="mt-1 text-sm font-medium">&ldquo;Shipped in a weekend&rdquo;</p>
      </div>
    </div>
  );
}
