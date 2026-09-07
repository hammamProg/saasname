import type { Site } from "@/libs/webstats/sites";
import type { SiteGroup } from "@/libs/webstats/group-name";
import type { SiteOverview } from "@/libs/webstats/overview";
import SitesGrid from "@/components/dashboard/SitesGrid";
import GroupOptionsMenu from "@/components/dashboard/GroupOptionsMenu";
import NewGroupButton from "@/components/dashboard/NewGroupButton";

/** Splits the sites list into one section per group, plus an Ungrouped
 *  section for whatever is left. A site's group is assigned from its own
 *  options menu (see SiteOptionsMenu → GroupPicker), not from here — this
 *  component only lays out whatever assignment already exists. */
export default function GroupedSites({
  sites,
  groups,
  overview,
}: {
  sites: Site[];
  groups: SiteGroup[];
  overview: Record<string, SiteOverview>;
}) {
  // No groups yet: the plain grid, unchanged, so an account that never uses
  // this feature sees no difference from before it existed.
  if (groups.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <NewGroupButton />
        </div>
        <SitesGrid sites={sites} initial={overview} />
      </div>
    );
  }

  const byGroup = new Map<string, Site[]>();
  const ungrouped: Site[] = [];
  const groupIds = new Set(groups.map((g) => g.id));

  for (const site of sites) {
    if (site.groupId && groupIds.has(site.groupId)) {
      if (!byGroup.has(site.groupId)) byGroup.set(site.groupId, []);
      byGroup.get(site.groupId)!.push(site);
    } else {
      ungrouped.push(site);
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex justify-end">
        <NewGroupButton />
      </div>

      {groups.map((group) => {
        const groupSites = byGroup.get(group.id) ?? [];

        return (
          <section key={group.id} className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="section-heading flex items-baseline gap-2 text-lg font-extrabold">
                {group.name}
                <span className="text-sm font-normal text-muted">
                  {groupSites.length}
                </span>
              </h2>
              <GroupOptionsMenu groupId={group.id} name={group.name} />
            </div>

            {groupSites.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted">
                No websites here yet. Move one in from its options menu.
              </p>
            ) : (
              <SitesGrid sites={groupSites} initial={overview} />
            )}
          </section>
        );
      })}

      {ungrouped.length > 0 ? (
        <section className="space-y-4">
          <h2 className="section-heading text-lg font-extrabold text-muted">
            Ungrouped
          </h2>
          <SitesGrid sites={ungrouped} initial={overview} />
        </section>
      ) : null}
    </div>
  );
}
