import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { randomBytes } from "crypto";

function generateReferralCode(name: string): string {
  const namePart = name.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase() || "PART";
  const randomPart = randomBytes(3).toString("hex").toUpperCase();
  return `${namePart}${randomPart}`;
}

export async function POST(request: NextRequest) {
  try {
    // Auth check — must be admin
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check admin role via evaluator_profiles
    const { data: profile } = await supabase
      .from("evaluator_profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { applicationId, action, note } = body as {
      applicationId: string;
      action: "approve" | "reject";
      note?: string;
    };

    if (!applicationId || !action) {
      return NextResponse.json(
        { error: "applicationId and action are required" },
        { status: 400 }
      );
    }

    // Fetch the application
    const { data: application } = await supabase
      .from("referral_partners")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (application.status !== "pending") {
      return NextResponse.json(
        { error: `Application is already ${application.status}` },
        { status: 409 }
      );
    }

    const adminEmail = user.email || "admin";

    if (action === "approve") {
      // Generate a unique referral code
      let referralCode = generateReferralCode(application.full_name);
      
      // Ensure uniqueness (retry if collision)
      const { data: existing } = await supabase
        .from("referral_partners")
        .select("id")
        .eq("referral_code", referralCode)
        .single();
      
      if (existing) {
        referralCode = generateReferralCode(application.full_name) + randomBytes(1).toString("hex").toUpperCase();
      }

      const { error: updateError } = await supabase
        .from("referral_partners")
        .update({
          status: "approved",
          referral_code: referralCode,
          review_note: note || null,
          reviewed_by: adminEmail,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", applicationId);

      if (updateError) throw updateError;

      // Audit
      await supabase.from("referral_audit_log").insert({
        actor: adminEmail,
        entity_type: "referral_partners",
        entity_id: applicationId,
        old_status: "pending",
        new_status: "approved",
        note: note || `Approved — code ${referralCode} generated`,
      });

      return NextResponse.json({
        success: true,
        referralCode,
        message: `Approved. Instruct the applicant to create an account at /login using ${application.email}, then complete onboarding.`,
      });
    } else if (action === "reject") {
      const { error: updateError } = await supabase
        .from("referral_partners")
        .update({
          status: "rejected",
          review_note: note || null,
          reviewed_by: adminEmail,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", applicationId);

      if (updateError) throw updateError;

      await supabase.from("referral_audit_log").insert({
        actor: adminEmail,
        entity_type: "referral_partners",
        entity_id: applicationId,
        old_status: "pending",
        new_status: "rejected",
        note: note || "Rejected",
      });

      return NextResponse.json({ success: true, message: "Rejected." });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Review error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
