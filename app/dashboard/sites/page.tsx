import { redirect } from "next/navigation";

/** The sites list moved to the dashboard root when analytics became the
 *  primary product. Kept as a redirect so bookmarks and any link already in
 *  the wild still land somewhere useful. */
export default function SitesIndexRedirect() {
  redirect("/dashboard");
}
