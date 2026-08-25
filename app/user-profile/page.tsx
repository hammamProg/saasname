import { redirect } from "next/navigation";

export default function UserProfileRedirect() {
  redirect("/dashboard/settings");
}
