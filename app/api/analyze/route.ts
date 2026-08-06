import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { checkCredits, deductCredit, saveReport } from "@/lib/credits";
import { extractTextFromFiles } from "@/lib/extract";
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

    // Check credits
    const creditCheck = await checkCredits(user.id);
    if (!creditCheck.hasCredit) {
      return NextResponse.json(
        { error: "Insufficient credits. Please purchase credits to continue." },
        { status: 402 }
      );
    }

    // Parse multipart form
    const formData = await request.formData();
    const files: File[] = [];
    const entries = formData.getAll("files");
    for (const entry of entries) {
      if (entry instanceof File) {
        files.push(entry);
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    // Validate files
    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds 25MB limit` },
          { status: 400 }
        );
      }
      const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
      const validExt =
        file.name.toLowerCase().endsWith(".pdf") ||
        file.name.toLowerCase().endsWith(".jpg") ||
        file.name.toLowerCase().endsWith(".jpeg") ||
        file.name.toLowerCase().endsWith(".png") ||
        file.name.toLowerCase().endsWith(".webp");

      if (!validTypes.includes(file.type) && !validExt) {
        return NextResponse.json(
          { error: `File ${file.name} is not a supported type. Use PDF, JPG, PNG, or WebP.` },
          { status: 400 }
        );
      }
    }

    if (files.length > 10) {
      return NextResponse.json(
        { error: "Maximum 10 files per evaluation" },
        { status: 400 }
      );
    }

    // Extract text from all files
    const { text, fileCount } = await extractTextFromFiles(files);

    if (!text || text.replace(/---.*---/g, "").trim().length < 50) {
      return NextResponse.json(
        { error: "Could not extract enough text from the uploaded files. The documents may be scanned images of poor quality." },
        { status: 422 }
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
      fileCount,
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
