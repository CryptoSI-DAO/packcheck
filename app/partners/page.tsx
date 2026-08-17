import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import PartnerDashboardClient from "./partner-dashboard-client";

export default async function PartnerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/partners");
  }

  // Find partner record by email
  const { data: partner } = await supabase
    .from("referral_partners")
    .select("*")
    .eq("email", user.email || "")
    .single();

  // Not a partner at all
  if (!partner) {
    redirect("/partners/apply");
  }

  // Not approved
  if (partner.status !== "approved") {
    redirect("/partners/apply");
  }

  // Provision: link auth user if first login
  if (!partner.auth_user_id) {
    await supabase
      .from("referral_partners")
      .update({ auth_user_id: user.id })
      .eq("id", partner.id);
    await supabase.from("referral_audit_log").insert({
      actor: user.email || "unknown",
      entity_type: "referral_partners",
      entity_id: partner.id,
      old_status: "approved",
      new_status: "approved",
      note: "Partner logged in — auth user linked",
    });
  }

  // Fetch commissions
  const { data: commissions } = await supabase
    .from("referral_commissions")
    .select("*")
    .eq("partner_id", partner.id)
    .order("created_at", { ascending: false })
    .limit(50);

  // Fetch referred users count
  const { count: referredCount } = await supabase
    .from("evaluator_profiles")
    .select("user_id", { count: "exact", head: true })
    .eq("referred_by_partner_id", partner.id);

  return (
    <PartnerDashboardClient
      partner={{
        name: partner.full_name,
        email: partner.email,
        referralCode: partner.referral_code,
        onboardingCompleted: partner.onboarding_completed,
      }}
      commissions={commissions || []}
      referredCount={referredCount || 0}
    />
  );
}
