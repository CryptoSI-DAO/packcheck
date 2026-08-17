import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { randomBytes } from "crypto";

function generateReferralCode(name: string): string {
  // Generate a readable code: first 4 letters of name + 4 random chars
  const namePart = name.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase() || "PART";
  const randomPart = randomBytes(3).toString("hex").toUpperCase();
  return `${namePart}${randomPart}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      email,
      fullName,
      profession,
      company,
      expectedMonthlyReferrals,
      howWillYouRefer,
      utmSource,
    } = body;

    // Validation
    if (!email || !fullName) {
      return NextResponse.json(
        { error: "Email and full name are required." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check for existing application with this email
    const { data: existing } = await supabase
      .from("referral_partners")
      .select("id, status")
      .eq("email", email.toLowerCase())
      .single();

    if (existing) {
      if (existing.status === "pending") {
        return NextResponse.json(
          { error: "An application with this email is already under review." },
          { status: 409 }
        );
      }
      if (existing.status === "approved") {
        return NextResponse.json(
          { error: "This email has already been approved. Please sign in to the portal." },
          { status: 409 }
        );
      }
      // If rejected, allow re-application by deleting old record
      // (admin may have rejected due to missing info)
      await supabase.from("referral_partners").delete().eq("id", existing.id);
    }

    // Create the application
    const { data: application, error } = await supabase
      .from("referral_partners")
      .insert({
        email: email.toLowerCase(),
        full_name: fullName,
        profession: profession || null,
        company: company || null,
        expected_monthly_referrals: expectedMonthlyReferrals || 0,
        how_will_you_refer: howWillYouRefer || null,
        utm_source: utmSource || null,
        status: "pending",
        // Pre-generate the code so it exists on approval
        referral_code: null,
      })
      .select("id, email, full_name, status, created_at")
      .single();

    if (error) {
      console.error("Application creation error:", error);
      return NextResponse.json(
        { error: "Failed to submit application. Please try again." },
        { status: 500 }
      );
    }

    // Audit entry
    await supabase.from("referral_audit_log").insert({
      actor: "public:apply",
      entity_type: "referral_partners",
      entity_id: application.id,
      old_status: null,
      new_status: "pending",
      note: `Application submitted by ${email}`,
    });

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      message: "Application submitted. We'll review it within 3 working days.",
    });
  } catch (error) {
    console.error("Apply endpoint error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
