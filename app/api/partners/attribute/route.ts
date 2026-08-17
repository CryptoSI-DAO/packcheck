import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * Resolves a referral code (from ?ref= link or manual entry) to a partner,
 * and attributes the current user to that partner with the 10% lifetime discount.
 * Called from the signup/login page after successful auth.
 */
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
    const { referralCode } = body as { referralCode: string };

    if (!referralCode) {
      return NextResponse.json({ error: "referralCode required" }, { status: 400 });
    }

    // Normalize
    const code = referralCode.trim().toUpperCase();

    // Find the partner
    const { data: partner } = await supabase
      .from("referral_partners")
      .select("id, status, referral_code")
      .eq("referral_code", code)
      .single();

    if (!partner || partner.status !== "approved") {
      return NextResponse.json(
        { error: "Invalid or inactive referral code." },
        { status: 404 }
      );
    }

    // Check the user isn't already referred (attribution is immutable)
    const { data: profile } = await supabase
      .from("evaluator_profiles")
      .select("referred_by_partner_id, referral_discount")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.referred_by_partner_id) {
      return NextResponse.json(
        { error: "This account is already attributed to a partner." },
        { status: 409 }
      );
    }

    // Partner can't refer themselves
    const { data: partnerRecord } = await supabase
      .from("referral_partners")
      .select("auth_user_id")
      .eq("id", partner.id)
      .single();

    if (partnerRecord?.auth_user_id === user.id) {
      return NextResponse.json(
        { error: "You cannot use your own referral code." },
        { status: 400 }
      );
    }

    // Attribute: set partner + lifetime discount
    const { error } = await supabase
      .from("evaluator_profiles")
      .update({
        referred_by_partner_id: partner.id,
        referral_discount: true,
      })
      .eq("user_id", user.id);

    if (error) throw error;

    // Audit
    await supabase.from("referral_audit_log").insert({
      actor: user.email || "unknown",
      entity_type: "evaluator_profiles",
      entity_id: user.id,
      old_status: null,
      new_status: "referred",
      note: `User attributed to partner ${partner.referral_code} with 10% lifetime discount`,
    });

    return NextResponse.json({
      success: true,
      discountApplied: true,
      message: "Referral applied! You now get 10% off all credit purchases, for life.",
    });
  } catch (error) {
    console.error("Referral attribution error:", error);
    return NextResponse.json({ error: "Failed to apply referral" }, { status: 500 });
  }
}
