const steps = [
  { emoji: "👨‍💻", label: "8 hrs to add Stripe" },
  { emoji: "😮‍💨", label: "Struggle to find time" },
  { emoji: "😔", label: "Quit project" },
];

export default function Problem() {
  return (
    <section className="bg-surface-dark py-16 text-white sm:py-20">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
        <h2 className="section-heading text-3xl font-extrabold sm:text-4xl">
          80% of startups fail because founders never launch
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
          Emails, DNS records, user authentication... There&apos;s so much going on.
        </p>

        <div className="mt-14 flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-4">
          {steps.map((step, index) => (
            <div key={step.label} className="flex items-center gap-4 sm:flex-col sm:gap-3">
              {index > 0 && (
                <span className="hidden text-2xl text-slate-500 sm:inline" aria-hidden="true">
                  ↷
                </span>
              )}
              <div>
                <span className="text-4xl" role="img" aria-hidden="true">
                  {step.emoji}
                </span>
                <p className="mt-2 max-w-[10rem] text-sm font-medium text-slate-300 sm:mx-auto">
                  {step.label}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
