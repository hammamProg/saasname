import { redirect } from "next/navigation";

export default function DashboardPremiumRedirect() {
  redirect("/dashboard/shipnow");
}
