import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import AdminPartnersClient from "./admin-partners-client";

export default async function AdminPartnersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/partners/admin");
  }

  const { data: profile } = await supabase
    .from("evaluator_profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/dashboard");
  }

  // Fetch all applications
  const { data: applications } = await supabase
    .from("referral_partners")
    .select("*")
    .order("created_at", { ascending: false });

  // Fetch commission summary per partner
  const { data: commissions } = await supabase
    .from("referral_commissions")
    .select("partner_id, commission_amount_pence, status");

  const commissionSummary: Record<string, { total: number; paid: number; pending: number }> = {};
  for (const c of commissions || []) {
    if (!commissionSummary[c.partner_id]) {
      commissionSummary[c.partner_id] = { total: 0, paid: 0, pending: 0 };
    }
    commissionSummary[c.partner_id].total += c.commission_amount_pence;
    if (c.status === "paid") {
      commissionSummary[c.partner_id].paid += c.commission_amount_pence;
    } else {
      commissionSummary[c.partner_id].pending += c.commission_amount_pence;
    }
  }

  return (
    <AdminPartnersClient
      applications={applications || []}
      commissionSummary={commissionSummary}
      adminEmail={user.email || ""}
    />
  );
}
