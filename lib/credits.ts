import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy-init: avoid crashing Vercel build when env vars aren't present at static analysis time
let _admin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return _admin;
}

export type CreditCheckResult = {
  hasCredit: boolean;
  source: "free" | "paid" | null;
};

/** Check if user has an available credit (free first, then paid) */
export async function checkCredits(userId: string): Promise<CreditCheckResult> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: profile, error } = await getAdmin()
    .from("evaluator_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !profile) {
    return { hasCredit: false, source: null };
  }

  // Check if we need to reset the free credit
  const needsReset =
    profile.free_credit_reset_month < currentMonth ||
    (profile.free_credit_reset_month === currentMonth &&
      profile.free_credit_reset_year < currentYear) ||
    profile.free_credit_reset_year < currentYear;

  if (needsReset && profile.free_credit_used_this_month) {
    // Reset free credit
    await getAdmin()
      .from("evaluator_profiles")
      .update({
        free_credit_used_this_month: false,
        free_credit_reset_month: currentMonth,
        free_credit_reset_year: currentYear,
      })
      .eq("user_id", userId);

    return { hasCredit: true, source: "free" };
  }

  if (!profile.free_credit_used_this_month) {
    return { hasCredit: true, source: "free" };
  }

  if (profile.credits > 0) {
    return { hasCredit: true, source: "paid" };
  }

  return { hasCredit: false, source: null };
}

/** Deduct a credit (free first, then paid). Call after successful analysis. */
export async function deductCredit(userId: string): Promise<void> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: profile } = await getAdmin()
    .from("evaluator_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!profile) return;

  // Reset if needed
  const needsReset =
    profile.free_credit_reset_month < currentMonth ||
    (profile.free_credit_reset_month === currentMonth &&
      profile.free_credit_reset_year < currentYear) ||
    profile.free_credit_reset_year < currentYear;

  const usedThisMonth = needsReset ? false : profile.free_credit_used_this_month;

  if (!usedThisMonth) {
    // Use free credit
    await getAdmin()
      .from("evaluator_profiles")
      .update({
        free_credit_used_this_month: true,
        free_credit_reset_month: currentMonth,
        free_credit_reset_year: currentYear,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  } else {
    // Deduct a paid credit
    await getAdmin()
      .from("evaluator_profiles")
      .update({
        credits: Math.max(0, profile.credits - 1),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  }
}

/** Add credits after Stripe payment */
export async function addCredits(userId: string, amount: number): Promise<void> {
  const { data: profile } = await getAdmin()
    .from("evaluator_profiles")
    .select("credits")
    .eq("user_id", userId)
    .single();

  const newTotal = (profile?.credits ?? 0) + amount;

  await getAdmin()
    .from("evaluator_profiles")
    .update({ credits: newTotal, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}

/** Save a report to the database, trimming to last 5 */
export async function saveReport(
  userId: string,
  reportData: unknown,
  meta: {
    propertyAddress?: string;
    propertyType?: string;
    overallVerdict?: string;
    fileCount: number;
  }
): Promise<string | null> {
  const { data: report, error } = await getAdmin()
    .from("evaluator_reports")
    .insert({
      user_id: userId,
      report_data: reportData as any,
      property_address: meta.propertyAddress ?? null,
      property_type: meta.propertyType ?? null,
      overall_verdict: meta.overallVerdict ?? null,
      file_count: meta.fileCount,
    })
    .select("id")
    .single();

  if (error || !report) return null;

  // Trim to last 5: count reports and delete oldest beyond 5
  const { data: allReports } = await getAdmin()
    .from("evaluator_reports")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (allReports && allReports.length > 5) {
    const toDelete = allReports.slice(5).map((r) => r.id);
    await getAdmin()
      .from("evaluator_reports")
      .delete()
      .in("id", toDelete);
  }

  return report.id;
}
