import { createClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import ReportDisplay from "./report-display";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return notFound();

  const { data: report } = await supabase
    .from("evaluator_reports")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!report) return notFound();

  return (
    <ReportDisplay
      report={{
        id: report.id,
        reportData: report.report_data,
        createdAt: report.created_at,
      }}
    />
  );
}
