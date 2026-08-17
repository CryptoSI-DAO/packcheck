"use client";

import { useState } from "react";
import Link from "next/link";

export default function PartnerApplyPage() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    profession: "",
    company: "",
    expectedMonthlyReferrals: "",
    howWillYouRefer: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const professions = [
    "Estate Agent",
    "Conveyancing Solicitor",
    "Mortgage Broker",
    "Property Investor",
    "Landlord",
    "Property Developer",
    "Content Creator / Influencer",
    "Other",
  ];

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/partners/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          fullName: form.fullName,
          profession: form.profession,
          company: form.company,
          expectedMonthlyReferrals: parseInt(form.expectedMonthlyReferrals) || 0,
          howWillYouRefer: form.howWillYouRefer,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setResult({
          success: true,
          message: data.message,
        });
      } else {
        setResult({
          success: false,
          message: data.error || "Failed to submit. Please try again.",
        });
      }
    } catch {
      setResult({
        success: false,
        message: "Something went wrong. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  // Success state
  if (result?.success) {
    return (
      <div className="min-h-screen bg-soft-mist flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-premium p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-forest/10 flex items-center justify-center text-3xl">
            ✅
          </div>
          <h1 className="font-serif text-2xl text-charcoal mb-3">
            Application submitted
          </h1>
          <p className="text-sm text-charcoal/60 leading-relaxed mb-8">
            {result.message}
          </p>
          <p className="text-xs text-charcoal/40 mb-6">
            Once approved, you&apos;ll create an account with this email and
            get access to your partner dashboard with your referral link.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-charcoal text-warm-stone rounded-lg text-sm font-medium hover:bg-charcoal-light transition"
          >
            Back to PackCheck
          </Link>
        </div>
      </div>
    );
  }

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
        <Link href="/" className="text-sm text-warm-stone/60 hover:text-warm-stone transition">
          ← Back
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <div className="inline-block px-3 py-1 mb-4 text-xs tracking-widest uppercase text-brass border border-brass/30 rounded-full">
            Partner Programme
          </div>
          <h1 className="font-serif text-3xl md:text-4xl text-charcoal mb-3">
            Earn 20% commission for life
          </h1>
          <p className="text-charcoal/60 leading-relaxed">
            Refer your clients to PackCheck and earn 20% of every credit
            purchase they make — forever. Your referrals also get{" "}
            <strong className="text-charcoal">10% off for life</strong>,
            so everyone wins.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-premium p-6 md:p-8">
          {result && !result.success && (
            <div className="mb-6 p-4 bg-alert-red/10 border border-alert-red/20 rounded-lg text-sm text-alert-red">
              {result.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal/50 mb-1.5">
                Full name *
              </label>
              <input
                type="text"
                required
                value={form.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                className="w-full px-4 py-3 border border-charcoal/15 rounded-lg focus:outline-none focus:border-brass text-sm"
                placeholder="Jane Smith"
              />
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal/50 mb-1.5">
                Email *
              </label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="w-full px-4 py-3 border border-charcoal/15 rounded-lg focus:outline-none focus:border-brass text-sm"
                placeholder="jane@agency.co.uk"
              />
              <p className="text-xs text-charcoal/40 mt-1">
                Use this email to create your account after approval.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal/50 mb-1.5">
                  Profession
                </label>
                <select
                  value={form.profession}
                  onChange={(e) => update("profession", e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/15 rounded-lg focus:outline-none focus:border-brass text-sm bg-white"
                >
                  <option value="">Select...</option>
                  {professions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal/50 mb-1.5">
                  Company (optional)
                </label>
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => update("company", e.target.value)}
                  className="w-full px-4 py-3 border border-charcoal/15 rounded-lg focus:outline-none focus:border-brass text-sm"
                  placeholder="Smith & Co Properties"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal/50 mb-1.5">
                Expected referrals per month
              </label>
              <select
                value={form.expectedMonthlyReferrals}
                onChange={(e) => update("expectedMonthlyReferrals", e.target.value)}
                className="w-full px-4 py-3 border border-charcoal/15 rounded-lg focus:outline-none focus:border-brass text-sm bg-white"
              >
                <option value="">Select...</option>
                <option value="1">1–5</option>
                <option value="6">6–20</option>
                <option value="21">21–50</option>
                <option value="51">50+</option>
              </select>
            </div>

            <div>
              <label className="block text-xs tracking-widest uppercase text-charcoal/50 mb-1.5">
                How will you refer clients? (optional)
              </label>
              <textarea
                rows={3}
                value={form.howWillYouRefer}
                onChange={(e) => update("howWillYouRefer", e.target.value)}
                className="w-full px-4 py-3 border border-charcoal/15 rounded-lg focus:outline-none focus:border-brass text-sm resize-none"
                placeholder="e.g. I'm a conveyancing solicitor — I'll include PackCheck in my client onboarding pack"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-brass text-white font-medium rounded-lg hover:bg-brass-dark transition disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Apply to become a partner"}
            </button>
          </form>
        </div>

        <div className="mt-6 bg-soft-mist rounded-xl p-4 text-xs text-charcoal/50 leading-relaxed">
          <strong>How it works:</strong> Apply → we review within 3 working days →
          create your account → get your referral link → share it with clients →
          earn 20% of every purchase they make, for life. Your referred clients
          get 10% off their credits permanently. Payouts by bank transfer once
          your balance reaches £25.
        </div>
      </div>
    </div>
  );
}
