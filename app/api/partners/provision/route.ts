import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Look for an approved application matching this auth email
    const { data: application } = await supabase
      .from("referral_partners")
      .select("id, email, status, referral_code, auth_user_id")
      .eq("email", user.email || "")
      .single();

    if (!application) {
      return NextResponse.json(
        { error: "No partner application found for this email address." },
        { status: 404 }
      );
    }

    if (application.status !== "approved") {
      return NextResponse.json(
        { error: `Application status is ${application.status}. Access requires approval.` },
        { status: 403 }
      );
    }

    // Link the auth user to the partner record if not already linked
    if (!application.auth_user_id) {
      await supabase
        .from("referral_partners")
        .update({
          auth_user_id: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", application.id);

      // Audit
      await supabase.from("referral_audit_log").insert({
        actor: user.email || "unknown",
        entity_type: "referral_partners",
        entity_id: application.id,
        old_status: "approved",
        new_status: "approved",
        note: "Account provisioned — auth user linked",
      });
    }

    return NextResponse.json({
      success: true,
      partnerId: application.id,
      referralCode: application.referral_code,
    });
  } catch (error) {
    console.error("Provision error:", error);
    return NextResponse.json({ error: "Provisioning failed" }, { status: 500 });
  }
}
