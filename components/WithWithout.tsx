import config from "@/config";

const withoutItems = [
  "Manually create invoices",
  "Or pay up to $2 per invoice",
  "Waste hours in customer support",
  "Can't update details once sent (VAT, Tax ID)",
  "Can't make invoices for previous purchases",
];

const withItems = [
  "Self-serve invoices",
  "One-time payment for unlimited invoices",
  "No more customer support",
  "Editable invoices to stay compliant",
  "Invoices for any payment, even past ones",
];

export default function WithWithout() {
  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h2 className="section-heading text-center text-3xl font-extrabold sm:text-4xl">
          Tired of building boilerplate from scratch?
        </h2>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-red-50 p-8">
            <h3 className="font-bold text-red-800">
              SaaS apps without {config.appName}
            </h3>
            <ul className="mt-6 space-y-3">
              {withoutItems.map((item) => (
                <li key={item} className="flex gap-3 text-red-900/80">
                  <span className="font-bold text-red-500">✕</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-green-50 p-8">
            <h3 className="font-bold text-green-800">SaaS apps + {config.appName}</h3>
            <ul className="mt-6 space-y-3">
              {withItems.map((item) => (
                <li key={item} className="flex gap-3 text-green-900/80">
                  <span className="font-bold text-green-600">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
