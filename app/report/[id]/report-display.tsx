"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Flag {
  title: string;
  detail: string;
  severity?: "low" | "medium" | "high";
}

interface ReportData {
  summary: string;
  propertyDetails: {
    type?: string;
    address?: string;
    bedrooms?: string;
    bathrooms?: string;
    price?: string;
    tenure?: string;
    epc?: string;
  };
  greenFlags: Flag[];
  redFlags: Flag[];
  documentsDetected: string[];
  overallVerdict: "green" | "amber" | "red";
}

export default function ReportDisplay({
  report,
}: {
  report: { id: string; reportData: Record<string, unknown>; createdAt: string };
}) {
  const [data, setData] = useState<ReportData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Try sessionStorage first (fresh analysis), fall back to reportData prop
    const cached = sessionStorage.getItem("latestReport");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.id === report.id) {
          setData(parsed);
        }
      } catch { /* fall through to prop */ }
    }
    setMounted(true);
  }, [report.id]);

  if (!data && mounted) {
    setData(report.reportData as unknown as ReportData);
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-warm-stone flex items-center justify-center">
        <div className="text-charcoal/40">Loading report...</div>
      </div>
    );
  }

  const verdictConfig = {
    green: { bg: "bg-forest", label: "🟢 Green", text: "Good overall package" },
    amber: { bg: "bg-alert-amber", label: "🟡 Amber", text: "Some concerns — investigate further" },
    red: { bg: "bg-alert-red", label: "🔴 Red", text: "High-risk issues detected" },
  };

  const verdict = verdictConfig[data.overallVerdict] ?? verdictConfig.amber;
  const pd = data.propertyDetails;

  const severityConfig = {
    high: { bg: "bg-alert-red/10", text: "text-alert-red", label: "HIGH" },
    medium: { bg: "bg-alert-amber/10", text: "text-alert-amber", label: "MEDIUM" },
    low: { bg: "bg-forest/10", text: "text-forest", label: "LOW" },
  };

  return (
    <div className="min-h-screen bg-soft-mist">
      {/* Nav */}
      <nav className="bg-charcoal px-6 md:px-12 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brass flex items-center justify-center">
            <span className="text-white font-serif text-lg font-bold">M</span>
          </div>
          <div>
            <div className="font-serif text-base text-warm-stone leading-none">PackCheck</div>
            <div className="text-[9px] tracking-widest uppercase text-warm-stone/50">by Mulcare Property</div>
          </div>
        </Link>
        <Link href="/dashboard" className="text-sm text-warm-stone/60 hover:text-warm-stone transition">
          ← Dashboard
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 md:px-12 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-xs tracking-widest uppercase text-charcoal/40 mb-2">
            Property Evaluation Report
          </div>
          <h1 className="font-serif text-3xl text-charcoal mb-3">
            {pd?.type || "Property"} · {pd?.address || "Address not found"}
          </h1>
          <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-medium ${verdict.bg} text-white`}>
            {verdict.label} — {verdict.text}
          </div>
        </div>

        {/* Property Details Card */}
        <div className="bg-white rounded-2xl shadow-premium p-6 mb-6">
          <h2 className="font-serif text-lg text-charcoal mb-4">Property Details</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <DetailItem label="Type" value={pd?.type} />
            <DetailItem label="Bedrooms" value={pd?.bedrooms} />
            <DetailItem label="Bathrooms" value={pd?.bathrooms} />
            <DetailItem label="Price" value={pd?.price} />
            <DetailItem label="Tenure" value={pd?.tenure} />
            <DetailItem label="EPC Rating" value={pd?.epc} />
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl shadow-premium p-6 mb-6">
          <h2 className="font-serif text-lg text-charcoal mb-3">Summary</h2>
          <p className="text-sm text-charcoal/70 leading-relaxed whitespace-pre-line">{data.summary}</p>
        </div>

        {/* Documents Detected */}
        {data.documentsDetected?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-premium p-6 mb-6">
            <h2 className="font-serif text-lg text-charcoal mb-4">Documents in Pack</h2>
            <div className="flex flex-wrap gap-2">
              {data.documentsDetected.map((doc, i) => (
                <span key={i} className="px-3 py-1 bg-soft-mist rounded-lg text-xs text-charcoal/70">
                  📄 {doc}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Green Flags */}
        <div className="bg-white rounded-2xl shadow-premium p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">✅</span>
            <h2 className="font-serif text-lg text-forest">Green Flags</h2>
          </div>
          <div className="space-y-4">
            {data.greenFlags?.map((flag, i) => (
              <div key={i} className="flex gap-3 pb-4 border-b border-charcoal/5 last:border-0 last:pb-0">
                <span className="text-forest mt-0.5">✓</span>
                <div>
                  <div className="text-sm font-medium text-charcoal">{flag.title}</div>
                  <div className="text-sm text-charcoal/60 mt-0.5">{flag.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Red Flags */}
        <div className="bg-white rounded-2xl shadow-premium p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🚩</span>
            <h2 className="font-serif text-lg text-alert-red">Red Flags</h2>
          </div>
          <div className="space-y-4">
            {data.redFlags?.map((flag, i) => {
              const sev = severityConfig[flag.severity || "medium"];
              return (
                <div key={i} className="flex gap-3 pb-4 border-b border-charcoal/5 last:border-0 last:pb-0">
                  <span className="text-alert-red mt-0.5">!</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-charcoal">{flag.title}</span>
                      {flag.severity && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${sev.bg} ${sev.text}`}>
                          {sev.label}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-charcoal/60 mt-0.5">{flag.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-soft-mist rounded-xl p-4 mb-6">
          <p className="text-xs text-charcoal/50 leading-relaxed">
            <strong>Disclaimer:</strong> This AI-generated report is provided for informational purposes only.
            It does not constitute legal, financial, or surveying advice. Always consult a qualified
            professional before making property decisions. The AI may not identify all issues present in the
            documents, and some findings may be incomplete or inaccurate.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/evaluate"
            className="flex-1 py-3.5 text-center bg-charcoal text-warm-stone font-medium rounded-lg hover:bg-charcoal-light transition"
          >
            Evaluate Another Pack
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 py-3.5 text-center text-charcoal border border-charcoal/15 rounded-lg hover:border-charcoal/30 transition"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="text-xs tracking-widest uppercase text-charcoal/40 mb-0.5">{label}</div>
      <div className="text-sm text-charcoal font-medium">{value || "Not found"}</div>
    </div>
  );
}
