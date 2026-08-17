import Stripe from "stripe";

export function getStripe(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-06-20" as Stripe.LatestApiVersion,
    typescript: true,
  });
}

export const CREDIT_BUNDLES = {
  "eval-1": { credits: 1, name: "1 Evaluation", price: 150, displayPrice: "£1.50" },
  "eval-5": { credits: 5, name: "5 Evaluations", price: 600, displayPrice: "£6.00" },
  "eval-10": { credits: 10, name: "10 Evaluations", price: 1000, displayPrice: "£10.00" },
} as const;

export type BundleId = keyof typeof CREDIT_BUNDLES;

export async function createCheckoutSession(
  userId: string,
  bundleId: BundleId,
  userEmail: string,
  applyDiscount = false
): Promise<string> {
  const stripe = getStripe();
  const bundle = CREDIT_BUNDLES[bundleId];

  // 10% lifetime discount for referred users
  const finalPrice = applyDiscount
    ? Math.round(bundle.price * 0.9)
    : bundle.price;
  const displayPrice = applyDiscount
    ? `£${(finalPrice / 100).toFixed(2)} (10% referral discount applied)`
    : bundle.displayPrice;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: userEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: finalPrice,
          product_data: {
            name: bundle.name,
            description: `${bundle.credits} PackCheck evaluation credit${bundle.credits > 1 ? "s" : ""}${applyDiscount ? " — 10% referral discount" : ""}`,
          },
        },
      },
    ],
    client_reference_id: `${userId}:${bundleId}`,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?credits=purchased`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?credits=cancelled`,
    metadata: {
      user_id: userId,
      bundle_id: bundleId,
      credits: String(bundle.credits),
      discounted: applyDiscount ? "true" : "false",
      amount_paid: String(finalPrice),
    },
  });

  return session.url!;
}

export async function handleWebhookEvent(
  rawBody: string,
  signature: string
): Promise<{ received: boolean; userId?: string; credits?: number; stripeSessionId?: string }> {
  const stripe = getStripe();
  const event = stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const creditsStr = session.metadata?.credits;

    if (userId && creditsStr) {
      return {
        received: true,
        userId,
        credits: parseInt(creditsStr, 10),
        stripeSessionId: session.id,
      };
    }
  }

  return { received: true };
}
