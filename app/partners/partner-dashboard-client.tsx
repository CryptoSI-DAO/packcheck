"use client";

import { useState } from "react";
import Link from "next/link";

interface Commission {
  id: string;
  purchase_amount_pence: number;
  commission_amount_pence: number;
  status: string;
  created_at: string;
  rule_version: string;
}

interface Props {
  partner: {
    name: string;
    email: string;
    referralCode: string;
    onboardingCompleted: boolean;
  };
  commissions: Commission[];
  referredCount: number;
}

export default function PartnerDashboardClient({
  partner,
  commissions,
  referredCount,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [onboarding, setOnboarding] = useState({
    payoutName: "",
    bankDetails: "",
    termsAccepted: false,
  });
  const [onboardingDone, setOnboardingDone] = useState(partner.onboardingCompleted);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/login?ref=${partner.referralCode}`
      : `/login?ref=${partner.referralCode}`;

  const totalEarned = commissions.reduce((sum, c) => sum + c.commission_amount_pence, 0);
  const pendingAmount = commissions
    .filter((c) => c.status === "eligible" || c.status === "payable")
    .reduce((sum, c) => sum + c.commission_amount_pence, 0);
  const paidAmount = commissions
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + c.commission_amount_pence, 0);

  function copyLink() {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleOnboarding(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setOnboardingError(null);

    try {
      const res = await fetch("/api/partners/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(onboarding),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOnboardingDone(true);
      } else {
        setOnboardingError(data.error || "Failed to save. Please try again.");
      }
    } catch {
      setOnboardingError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
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
            <div className="text-[9px] tracking-widest uppercase text-warm-stone/50">Partner Portal</div>
          </div>
        </Link>
        <Link href="/dashboard" className="text-sm text-warm-stone/60 hover:text-warm-stone transition">
          User Dashboard →
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="font-serif text-3xl text-charcoal mb-1">
          Welcome, {partner.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-charcoal/50 mb-8">
          Earn 20% commission on every credit purchase by your referrals — for life.
        </p>

        {/* Onboarding gate */}
        {!onboardingDone && (
          <div className="bg-white rounded-2xl shadow-premium p-6 md:p-8 mb-6">
            <h2 className="font-serif text-xl text-charcoal mb-2">
              Complete your payout setup
            </h2>
            <p className="text-sm text-charcoal/50 mb-6">
              We need your details to send your commissions. This takes 30 seconds.
            </p>
            {onboardingError && (
              <div className="mb-4 p-3 bg-alert-red/10 border border-alert-red/20 rounded-lg text-sm text-alert-red">
                {onboardingError}
              </div>
            )}
            <form onSubmit={handleOnboarding} className="space-y-4">
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal/50 mb-1.5">
                  Name on account *
                </label>
                <input
                  type="text"
                  required
                  value={onboarding.payoutName}
                  onChange={(e) => setOnboarding((o) => ({ ...o, payoutName: e.target.value }))}
                  className="w-full px-4 py-3 border border-charcoal/15 rounded-lg text-sm focus:outline-none focus:border-brass"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="block text-xs tracking-widest uppercase text-charcoal/50 mb-1.5">
                  Bank details (sort code + account number, or IBAN) *
                </label>
                <input
                  type="text"
                  required
                  value={onboarding.bankDetails}
                  onChange={(e) => setOnboarding((o) => ({ ...o, bankDetails: e.target.value }))}
                  className="w-full px-4 py-3 border border-charcoal/15 rounded-lg text-sm focus:outline-none focus:border-brass"
                  placeholder="04-00-04 · 12345678"
                />
                <p className="text-xs text-charcoal/40 mt-1">
                  Stored securely, server-side only. Used solely for commission payouts.
                </p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={onboarding.termsAccepted}
                  onChange={(e) => setOnboarding((o) => ({ ...o, termsAccepted: e.target.checked }))}
                  className="mt-1 accent-brass"
                />
                <span className="text-xs text-charcoal/60 leading-relaxed">
                  I accept the partner terms: 20% commission on referred credit
                  purchases for the lifetime of the referred account, paid by bank
                  transfer once my balance reaches £25. Commissions on refunded
                  purchases are clawed back. Self-referrals are not eligible.
                </span>
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-brass text-white font-medium rounded-lg hover:bg-brass-dark transition disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Complete setup"}
              </button>
            </form>
          </div>
        )}

        {/* Referral link card */}
        <div className="bg-white rounded-2xl shadow-premium p-6 md:p-8 mb-6">
          <h2 className="font-serif text-xl text-charcoal mb-1">Your referral link</h2>
          <p className="text-sm text-charcoal/50 mb-4">
            Share this — anyone who signs up through it gets{" "}
            <strong className="text-charcoal">10% off for life</strong>, and you earn 20%.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              readOnly
              value={referralLink}
              className="flex-1 px-4 py-3 bg-soft-mist border border-charcoal/10 rounded-lg text-sm font-mono text-charcoal"
            />
            <button
              onClick={copyLink}
              className="px-6 py-3 bg-charcoal text-warm-stone rounded-lg text-sm font-medium hover:bg-charcoal-light transition whitespace-nowrap"
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-xs text-charcoal/40">Your code:</span>
            <span className="px-3 py-1 bg-brass/10 text-brass rounded-lg font-mono text-sm font-bold">
              {partner.referralCode}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-premium p-5">
            <div className="text-xs tracking-widest uppercase text-charcoal/40 mb-1">
              Referred users
            </div>
            <div className="font-serif text-3xl text-charcoal">{referredCount}</div>
          </div>
          <div className="bg-white rounded-2xl shadow-premium p-5">
            <div className="text-xs tracking-widest uppercase text-charcoal/40 mb-1">
              Total earned
            </div>
            <div className="font-serif text-3xl text-charcoal">
              £{(totalEarned / 100).toFixed(2)}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-premium p-5">
            <div className="text-xs tracking-widest uppercase text-charcoal/40 mb-1">
              Pending payout
            </div>
            <div className="font-serif text-3xl text-brass">
              £{(pendingAmount / 100).toFixed(2)}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-premium p-5">
            <div className="text-xs tracking-widest uppercase text-charcoal/40 mb-1">
              Paid out
            </div>
            <div className="font-serif text-3xl text-forest">
              £{(paidAmount / 100).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Commission history */}
        <div className="bg-white rounded-2xl shadow-premium p-6">
          <h2 className="font-serif text-xl text-charcoal mb-4">Commission history</h2>
          {commissions.length === 0 ? (
            <div className="text-center py-10 text-charcoal/40">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-sm">
                No commissions yet. Share your link — earnings appear here the
                moment a referral makes their first purchase.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {commissions.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-4 bg-soft-mist rounded-xl"
                >
                  <div>
                    <div className="text-sm font-semibold text-charcoal">
                      + £{(c.commission_amount_pence / 100).toFixed(2)}
                    </div>
                    <div className="text-xs text-charcoal/50">
                      on £{(c.purchase_amount_pence / 100).toFixed(2)} purchase ·{" "}
                      {new Date(c.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                      c.status === "paid"
                        ? "bg-forest/10 text-forest"
                        : c.status === "clawed_back"
                          ? "bg-alert-red/10 text-alert-red"
                          : "bg-alert-amber/10 text-alert-amber"
                    }`}
                  >
                    {c.status.replace("_", " ")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
