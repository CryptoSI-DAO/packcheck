"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";

interface Report {
  id: string;
  propertyAddress: string;
  propertyType: string;
  overallVerdict: string;
  createdAt: string;
}

export default function DashboardClient({
  user,
  credits,
  reports,
}: {
  user: { email: string };
  credits: { paid: number; freeAvailable: boolean };
  reports: Report[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPricing, setShowPricing] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const creditMsg = searchParams.get("credits");

  async function handlePurchase(bundle: string) {
    setPurchasing(bundle);
    setPurchaseError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundle }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPurchaseError("Failed to start checkout. Please try again.");
      }
    } catch {
      setPurchaseError("Something went wrong. Please try again.");
    } finally {
      setPurchasing(null);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  const totalCredits = credits.paid + (credits.freeAvailable ? 1 : 0);

  const verdictStyles: Record<string, { bg: string; text: string; label: string }> = {
    green: { bg: "bg-forest/10", text: "text-forest", label: "🟢 Green" },
    amber: { bg: "bg-alert-amber/10", text: "text-alert-amber", label: "🟡 Amber" },
    red: { bg: "bg-alert-red/10", text: "text-alert-red", label: "🔴 Red" },
  };

  return (
    <div className="min-h-screen bg-soft-mist">
      {/* Top Nav */}
      <nav className="bg-charcoal px-6 md:px-12 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brass flex items-center justify-center">
            <span className="text-white font-serif text-lg font-bold">M</span>
          </div>
          <div>
            <div className="font-serif text-base text-warm-stone leading-none">PackCheck</div>
            <div className="text-[9px] tracking-widest uppercase text-warm-stone/50">by Mulcare Property</div>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-warm-stone/60 hidden sm:block">{user.email}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-warm-stone/70 hover:text-warm-stone transition"
          >
            Sign Out
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 md:px-12 py-8">
        {/* Credit banner */}
        {creditMsg === "purchased" && (
          <div className="mb-6 p-4 bg-forest/10 border border-forest/20 rounded-xl text-sm text-forest">
            ✅ Credits added successfully! Your balance has been updated.
          </div>
        )}
        {creditMsg === "cancelled" && (
          <div className="mb-6 p-4 bg-alert-amber/10 border border-alert-amber/20 rounded-xl text-sm text-alert-amber">
            Purchase cancelled. No charge was made.
          </div>
        )}

        {/* Credits Card */}
        <div className="bg-white rounded-2xl shadow-premium p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs tracking-widest uppercase text-charcoal/40 mb-1">Your Credits</div>
              <div className="flex items-baseline gap-3">
                <span className="font-serif text-3xl text-charcoal">{totalCredits}</span>
                <span className="text-sm text-charcoal/50">
                  {totalCredits === 1 ? "evaluation" : "evaluations"} available
                </span>
              </div>
              <div className="flex gap-4 mt-2 text-xs text-charcoal/40">
                <span>🎁 Free: {credits.freeAvailable ? "1 available" : "used this month"}</span>
                <span>💰 Paid: {credits.paid}</span>
              </div>
            </div>
            <button
              onClick={() => setShowPricing(!showPricing)}
              className="px-5 py-2.5 bg-brass text-white text-sm font-medium rounded-lg hover:bg-brass-dark transition whitespace-nowrap"
            >
              Buy Credits
            </button>
          </div>

          {/* Pricing modal/inline */}
          {showPricing && (
            <div className="mt-6 grid sm:grid-cols-3 gap-4 fade-up">
              {[
                { id: "eval-1", name: "1 Credit", price: "£1.50", detail: "1 evaluation" },
                { id: "eval-5", name: "5 Credits", price: "£6.00", detail: "£1.20 each" },
                { id: "eval-10", name: "10 Credits", price: "£10.00", detail: "£1.00 each · Best Value" },
              ].map((b) => (
                <button
                  key={b.id}
                  onClick={() => handlePurchase(b.id)}
                  disabled={purchasing === b.id}
                  className="p-4 bg-soft-mist rounded-xl text-left hover:bg-warm-stone border border-transparent hover:border-brass/30 transition disabled:opacity-50"
                >
                  <div className="text-sm font-medium text-charcoal">{b.name}</div>
                  <div className="font-serif text-2xl text-charcoal mt-1">{b.price}</div>
                  <div className="text-xs text-charcoal/50">{b.detail}</div>
                </button>
              ))}
            </div>
          )}
          {purchaseError && (
            <div className="mt-4 p-3 bg-alert-red/10 border border-alert-red/20 rounded-lg text-sm text-alert-red">
              {purchaseError}
            </div>
          )}
        </div>

        {/* New Evaluation */}
        <Link
          href="/evaluate"
          className={`block rounded-2xl p-6 mb-6 transition ${
            totalCredits > 0
              ? "bg-charcoal hover:bg-charcoal-light"
              : "bg-charcoal/30 cursor-not-allowed"
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-serif text-xl text-warm-stone mb-1">
                + New Evaluation
              </div>
              <div className="text-sm text-warm-stone/60">
                {totalCredits > 0
                  ? "Upload a property pack to analyze"
                  : "Buy credits to run an evaluation"}
              </div>
            </div>
            <div className={`text-2xl ${totalCredits > 0 ? "text-brass" : "text-warm-stone/30"}`}>→</div>
          </div>
        </Link>

        {/* Report History */}
        <div className="bg-white rounded-2xl shadow-premium p-6">
          <h2 className="font-serif text-lg text-charcoal mb-4">Report History</h2>
          {reports.length === 0 ? (
            <div className="text-center py-12 text-charcoal/40">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm">No evaluations yet. Your last 5 reports will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => {
                const v = verdictStyles[r.overallVerdict] ?? verdictStyles.amber;
                return (
                  <Link
                    key={r.id}
                    href={`/report/${r.id}`}
                    className="flex items-center justify-between p-4 bg-soft-mist rounded-xl hover:bg-warm-stone transition group"
                  >
                    <div>
                      <div className="text-sm font-medium text-charcoal">
                        {r.propertyType} · {r.propertyAddress}
                      </div>
                      <div className="text-xs text-charcoal/50 mt-0.5">
                        {new Date(r.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${v.bg} ${v.text}`}>
                        {v.label}
                      </span>
                      <span className="text-charcoal/30 group-hover:text-charcoal/60 transition">→</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
