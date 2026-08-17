import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createCheckoutSession, CREDIT_BUNDLES, type BundleId } from "@/lib/stripe";

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
    const bundleId = body.bundle as BundleId;

    if (!bundleId || !(bundleId in CREDIT_BUNDLES)) {
      return NextResponse.json({ error: "Invalid bundle" }, { status: 400 });
    }

    // Check if user has the referral lifetime discount (10% off)
    const { data: profile } = await supabase
      .from("evaluator_profiles")
      .select("referral_discount")
      .eq("user_id", user.id)
      .single();

    const applyDiscount = profile?.referral_discount === true;

    const url = await createCheckoutSession(user.id, bundleId, user.email!, applyDiscount);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
