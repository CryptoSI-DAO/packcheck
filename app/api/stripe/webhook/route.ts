import { NextRequest, NextResponse } from "next/server";
import { handleWebhookEvent, getStripe } from "@/lib/stripe";
import { addCredits } from "@/lib/credits";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Admin client for commission writes (webhook has no user session)
function getAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

async function createReferralCommission(
  admin: SupabaseClient,
  userId: string,
  stripeSessionId: string,
  amountPaidPence: number
) {
  // Look up the user's referring partner
  const { data: profile } = await admin
    .from("evaluator_profiles")
    .select("referred_by_partner_id")
    .eq("user_id", userId)
    .single();

  if (!profile?.referred_by_partner_id) {
    return; // Not a referred user — no commission
  }

  const partnerId = profile.referred_by_partner_id;

  // Verify the partner is still approved
  const { data: partner } = await admin
    .from("referral_partners")
    .select("id, status")
    .eq("id", partnerId)
    .single();

  if (!partner || partner.status !== "approved") {
    return;
  }

  // Idempotency: check this Stripe session hasn't already generated a commission
  const { data: existing } = await admin
    .from("referral_commissions")
    .select("id")
    .eq("stripe_session_id", stripeSessionId)
    .single();

  if (existing) {
    return; // Already processed
  }

  // 20% commission, versioned per template principle #5
  const COMMISSION_RATE_BP = 2000; // 20% in basis points
  const commissionPence = Math.round((amountPaidPence * COMMISSION_RATE_BP) / 10000);

  if (commissionPence < 1) {
    return; // Skip dust
  }

  const { error } = await admin.from("referral_commissions").insert({
    partner_id: partnerId,
    referred_user_id: userId,
    stripe_session_id: stripeSessionId,
    purchase_amount_pence: amountPaidPence,
    commission_amount_pence: commissionPence,
    currency: "GBP",
    rule_version: "v1-20pct-lifetime",
    commission_rate_bp: COMMISSION_RATE_BP,
    status: "eligible",
  });

  if (error) {
    console.error("Commission creation error:", error);
    return;
  }

  // Audit
  await admin.from("referral_audit_log").insert({
    actor: "stripe:webhook",
    entity_type: "referral_commissions",
    entity_id: partnerId,
    old_status: null,
    new_status: "eligible",
    note: `Commission of ${commissionPence}p created on purchase ${stripeSessionId}`,
  });
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const result = await handleWebhookEvent(rawBody, signature);

    if (result.userId && result.credits && result.stripeSessionId) {
      const admin = getAdminClient();

      // Existing: add credits
      await addCredits(result.userId, result.credits);

      // New: create referral commission if this user was referred
      let amountPaid = 0;
      try {
        const stripe = getStripe();
        const session = await stripe.checkout.sessions.retrieve(result.stripeSessionId);
        amountPaid = session.metadata?.amount_paid
          ? parseInt(session.metadata.amount_paid, 10)
          : session.amount_total || 0;
      } catch (e) {
        console.error("Session retrieval for commission failed:", e);
      }

      if (amountPaid > 0) {
        await createReferralCommission(admin, result.userId, result.stripeSessionId, amountPaid);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 400 });
  }
}
