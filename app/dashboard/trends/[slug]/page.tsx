import { redirect } from "next/navigation";

/** Trends is off for now — see app/dashboard/trends/page.tsx. */
export default function TrendDetailDisabledRedirect() {
  redirect("/dashboard");
}
