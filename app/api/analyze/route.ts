import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { checkCredits, deductCredit, saveReport } from "@/lib/credits";
import { analyzeProperty } from "@/lib/analyze";

export const runtime = "nodejs";
export const maxDuration = 60;

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

    // Parse JSON body (text extracted client-side)
    const body = await request.json();
    const { text, fileCount } = body as { text: string; fileCount: number };

    if (!text || text.replace(/---.*---/g, "").trim().length < 50) {
      return NextResponse.json(
        { error: "Could not extract enough text from the uploaded files. The documents may be scanned images of poor quality." },
        { status: 422 }
      );
    }

    // Check credits
    const creditCheck = await checkCredits(user.id);
    if (!creditCheck.hasCredit) {
      return NextResponse.json(
        { error: "Insufficient credits. Please purchase credits to continue." },
        { status: 402 }
      );
    }

    // Run AI analysis
    const analysis = await analyzeProperty(text);

    // Deduct credit AFTER successful analysis
    await deductCredit(user.id);

    // Save report
    const reportId = await saveReport(user.id, analysis, {
      propertyAddress: analysis.propertyDetails.address,
      propertyType: analysis.propertyDetails.type,
      overallVerdict: analysis.overallVerdict,
      fileCount: fileCount || 1,
    });

    // Get updated credit info
    const { data: profile } = await supabase
      .from("evaluator_profiles")
      .select("credits, free_credit_used_this_month")
      .eq("user_id", user.id)
      .single();

    return NextResponse.json({
      id: reportId,
      ...analysis,
      creditsRemaining: {
        free: profile?.free_credit_used_this_month ? 0 : 1,
        paid: profile?.credits ?? 0,
      },
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Analysis failed. Please try again. No credit was deducted." },
      { status: 500 }
    );
  }
}
