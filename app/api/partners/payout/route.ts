import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

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

    const body = await request.json();
    const { partnerId, bankReference } = body as {
      partnerId: string;
      bankReference?: string;
    };

    if (!partnerId) {
      return NextResponse.json({ error: "partnerId required" }, { status: 400 });
    }

    // Atomic: creates payout row, marks all eligible commissions paid, audits.
    // Reuse-permit allows the admin to correct a failed attempt by re-running.
    const { data, error } = await supabase.rpc("complete_partner_payout", {
      p_partner_id: partnerId,
      p_bank_reference: bankReference || null,
    });

    if (error) {
      const msg = error.message || "Payout failed";
      const status = msg.includes("Admin access")
        ? 403
        : msg.includes("£25") || msg.includes("onboarding")
          ? 409
          : 500;
      return NextResponse.json({ error: msg }, { status });
    }

    const payoutId = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({
      success: true,
      payoutId,
      message: `Payout recorded. All eligible commissions for this partner are now marked paid.`,
    });
  } catch (error) {
    console.error("Payout completion error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
