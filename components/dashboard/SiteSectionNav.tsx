import Link from "next/link";

type Section = "overview" | "acquisition";

const TABS: { key: Section; label: string; path: (id: string) => string }[] = [
  { key: "overview", label: "Overview", path: (id) => `/dashboard/sites/${id}` },
  { key: "acquisition", label: "Acquisition", path: (id) => `/dashboard/sites/${id}/acquisition` },
];

export default function SiteSectionNav({
  siteId,
  active,
}: {
  siteId: string;
  active: Section;
}) {
  return (
    <nav className="flex gap-1 border-b border-border">
      {TABS.map((tab) =>
        tab.key === active ? (
          <span
            key={tab.key}
            className="border-b-2 border-primary px-3 pb-3 text-sm font-semibold text-foreground"
          >
            {tab.label}
          </span>
        ) : (
          <Link
            key={tab.key}
            href={tab.path(siteId)}
            className="px-3 pb-3 text-sm font-semibold text-muted transition hover:text-foreground"
          >
            {tab.label}
          </Link>
        ),
      )}
    </nav>
  );
}
