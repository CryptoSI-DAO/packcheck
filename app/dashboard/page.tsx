import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get profile + reports in parallel
  const [profileResult, reportsResult] = await Promise.all([
    supabase
      .from("evaluator_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("evaluator_reports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const profile = profileResult.data;
  const reports = reportsResult.data ?? [];

  // Check if free credit needs reset
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const needsReset =
    profile &&
    (profile.free_credit_reset_month < currentMonth ||
      profile.free_credit_reset_year < currentYear);

  const freeCreditAvailable =
    profile &&
    (needsReset || !profile.free_credit_used_this_month);

  return (
    <DashboardClient
      user={{ email: user.email! }}
      credits={{
        paid: profile?.credits ?? 0,
        freeAvailable: freeCreditAvailable ?? false,
      }}
      reports={reports.map((r) => ({
        id: r.id,
        propertyAddress: r.property_address ?? "Unknown address",
        propertyType: r.property_type ?? "Property",
        overallVerdict: r.overall_verdict ?? "amber",
        createdAt: r.created_at,
      }))}
    />
  );
}
