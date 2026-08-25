import { redirect } from "next/navigation";

export default function DashboardAccountRedirect() {
  redirect("/dashboard/settings");
}
