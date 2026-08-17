import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { payoutName, bankDetails, termsAccepted } = body as {
      payoutName: string;
      bankDetails: string;
      termsAccepted: boolean;
    };

    if (!payoutName || !bankDetails || !termsAccepted) {
      return NextResponse.json(
        { error: "All fields including terms acceptance are required." },
        { status: 400 }
      );
    }

    // Verify this user is an approved partner
    const { data: application } = await supabase
      .from("referral_partners")
      .select("id, status")
      .eq("email", user.email || "")
      .single();

    if (!application || application.status !== "approved") {
      return NextResponse.json(
        { error: "Approved partner account required." },
        { status: 403 }
      );
    }

    // Update onboarding
    const { error } = await supabase
      .from("referral_partners")
      .update({
        onboarding_completed: true,
        payout_method: "bank_transfer",
        payout_name: payoutName,
        payout_bank_details: bankDetails,
        updated_at: new Date().toISOString(),
      })
      .eq("id", application.id);

    if (error) throw error;

    // Audit
    await supabase.from("referral_audit_log").insert({
      actor: user.email || "unknown",
      entity_type: "referral_partners",
      entity_id: application.id,
      old_status: "approved",
      new_status: "approved",
      note: "Onboarding completed — payout details recorded",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json({ error: "Onboarding failed" }, { status: 500 });
  }
}
