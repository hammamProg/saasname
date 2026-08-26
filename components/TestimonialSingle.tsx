import Rating from "@/components/Rating";

export default function TestimonialSingle() {
  return (
    <figure className="mx-auto max-w-2xl text-center">
      <Rating value={5} className="justify-center text-xl" />
      <blockquote className="mt-6 text-2xl font-medium leading-relaxed">
        &ldquo;I built my app in almost a week. It cut the BS — exactly what you need
        to build a small SaaS.&rdquo;
      </blockquote>
      <figcaption className="mt-6 flex items-center justify-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft font-bold text-primary">
          A
        </div>
        <div className="text-left">
          <p className="font-bold">Alex M.</p>
          <p className="text-sm text-muted">Built a micro-SaaS in 2 weeks</p>
        </div>
      </figcaption>
    </figure>
  );
}
