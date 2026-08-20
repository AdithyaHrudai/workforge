import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardRouter() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role === "COMPANY") {
    redirect(user.companyProfile ? "/company" : "/company/profile");
  }
  // CONTRACTOR
  redirect(user.contractorProfile ? "/contractor" : "/contractor/profile");
}
