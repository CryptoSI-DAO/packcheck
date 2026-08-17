"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Application {
  id: string;
  email: string;
  full_name: string;
  profession: string | null;
  company: string | null;
  expected_monthly_referrals: number | null;
  how_will_you_refer: string | null;
  status: string;
  referral_code: string | null;
  review_note: string | null;
  reviewed_by: string | null;
  onboarding_completed: boolean;
  created_at: string;
}

interface Props {
  applications: Application[];
  commissionSummary: Record<string, { total: number; paid: number; pending: number }>;
  adminEmail: string;
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-alert-amber/10", text: "text-alert-amber", label: "Pending review" },
  approved: { bg: "bg-forest/10", text: "text-forest", label: "Approved" },
  rejected: { bg: "bg-alert-red/10", text: "text-alert-red", label: "Rejected" },
};

export default function AdminPartnersClient({ applications, commissionSummary }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const filtered = applications.filter((a) =>
    filter === "all" ? true : a.status === filter
  );

  const pendingCount = applications.filter((a) => a.status === "pending").length;

  async function handleReview(applicationId: string, action: "approve" | "reject") {
    setReviewing(applicationId);
    try {
      const res = await fetch("/api/partners/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId, action, note: note || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResult(data.message);
        setNote("");
        router.refresh();
      } else {
        setResult(data.error || "Failed");
      }
    } catch {
      setResult("Something went wrong");
    } finally {
      setReviewing(null);
    }
  }

  return (
    <div className="min-h-screen bg-soft-mist">
      {/* Nav */}
      <nav className="bg-charcoal px-6 md:px-12 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brass flex items-center justify-center">
            <span className="text-white font-serif text-lg font-bold">M</span>
          </div>
          <div>
            <div className="font-serif text-base text-warm-stone leading-none">PackCheck</div>
            <div className="text-[9px] tracking-widest uppercase text-warm-stone/50">Partner Admin</div>
          </div>
        </Link>
        <Link href="/dashboard" className="text-sm text-warm-stone/60 hover:text-warm-stone transition">
          ← Dashboard
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-2xl text-charcoal">Partner Applications</h1>
          {pendingCount > 0 && (
            <span className="px-3 py-1 bg-alert-amber/10 text-alert-amber rounded-full text-xs font-semibold">
              {pendingCount} pending
            </span>
          )}
        </div>

        {result && (
          <div className="mb-6 p-4 bg-forest/10 border border-forest/20 rounded-lg text-sm text-forest">
            {result}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {["all", "pending", "approved", "rejected"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === f
                  ? "bg-charcoal text-warm-stone"
                  : "bg-white text-charcoal/60 hover:text-charcoal border border-charcoal/10"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Applications list */}
        <div className="space-y-4">
          {filtered.length === 0 && (
            <div className="bg-white rounded-2xl shadow-premium p-12 text-center text-charcoal/40">
              No {filter === "all" ? "" : filter} applications yet.
            </div>
          )}

          {filtered.map((app) => {
            const status = statusConfig[app.status] || statusConfig.pending;
            const commissions = commissionSummary[app.id];
            return (
              <div key={app.id} className="bg-white rounded-2xl shadow-premium p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-semibold text-charcoal">{app.full_name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                      {app.referral_code && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-charcoal/5 text-charcoal/60 font-mono">
                          {app.referral_code}
                        </span>
                      )}
                      {app.onboarding_completed && app.status === "approved" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-forest/10 text-forest font-semibold">
                          Onboarded
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-charcoal/50 mb-1">
                      {app.email}
                      {app.profession && ` · ${app.profession}`}
                      {app.company && ` · ${app.company}`}
                    </p>
                    <p className="text-xs text-charcoal/40">
                      Expects ~{app.expected_monthly_referrals || "?"} referrals/month · Applied{" "}
                      {new Date(app.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                    {app.how_will_you_refer && (
                      <p className="text-xs text-charcoal/50 mt-2 italic bg-soft-mist rounded-lg p-3">
                        &ldquo;{app.how_will_you_refer}&rdquo;
                      </p>
                    )}
                    {commissions && (
                      <p className="text-xs text-charcoal/60 mt-2">
                        Commission: £{(commissions.total / 100).toFixed(2)} total · £
                        {(commissions.pending / 100).toFixed(2)} pending · £
                        {(commissions.paid / 100).toFixed(2)} paid
                      </p>
                    )}
                  </div>

                  {app.status === "pending" && (
                    <div className="flex flex-col gap-2 min-w-[200px]">
                      <textarea
                        rows={2}
                        value={reviewing === app.id ? note : ""}
                        onChange={(e) => {
                          setReviewing(app.id);
                          setNote(e.target.value);
                        }}
                        placeholder="Review note (optional)"
                        className="px-3 py-2 border border-charcoal/15 rounded-lg text-xs resize-none focus:outline-none focus:border-brass"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReview(app.id, "approve")}
                          disabled={reviewing === `${app.id}-loading`}
                          className="flex-1 py-2 bg-forest text-white rounded-lg text-xs font-semibold hover:opacity-90 transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReview(app.id, "reject")}
                          className="flex-1 py-2 bg-alert-red/10 text-alert-red rounded-lg text-xs font-semibold hover:bg-alert-red/20 transition"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
