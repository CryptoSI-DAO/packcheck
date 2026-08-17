"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";
import { useRouter, useSearchParams } from "next/navigation";

function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState("");
  const [showRefField, setShowRefField] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";
  const urlRef = searchParams.get("ref") || "";

  const supabase = createClient();

  // Apply referral code to the current user's profile
  async function applyReferralCode(code: string) {
    if (!code) return;
    try {
      const res = await fetch("/api/partners/attribute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referralCode: code }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotice(data.message);
      } else if (res.status !== 409) {
        // Don't show error if already attributed (409) — silently pass
        setNotice(data.error || "Referral code could not be applied.");
      }
    } catch {
      // Non-fatal — signup shouldn't fail because of referral issues
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        // Apply referral if from ?ref= link or manual entry
        const code = urlRef || referralCode;
        if (code) {
          // Small delay to let the profile trigger create the profile row
          await new Promise((r) => setTimeout(r, 1500));
          await applyReferralCode(code);
        }
        router.push(redirect);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Apply referral on login too (user may have signed up before getting a code)
        const code = urlRef || referralCode;
        if (code) {
          await applyReferralCode(code);
        }
        router.push(redirect);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-warm-stone flex flex-col justify-center px-6">
      <div className="max-w-md mx-auto w-full">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-charcoal flex items-center justify-center">
              <span className="text-brass font-serif text-xl font-bold">M</span>
            </div>
            <div className="text-left">
              <div className="font-serif text-lg text-charcoal leading-none">PackCheck</div>
              <div className="text-[10px] tracking-widest uppercase text-charcoal/50">by Mulcare Property</div>
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-premium p-8">
          {/* Tabs */}
          <div className="flex gap-2 mb-6 p-1 bg-soft-mist rounded-lg">
            <button
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
                mode === "login" ? "bg-white text-charcoal shadow-sm" : "text-charcoal/50"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition ${
                mode === "signup" ? "bg-white text-charcoal shadow-sm" : "text-charcoal/50"
              }`}
            >
              Create Account
            </button>
          </div>

          <h1 className="font-serif text-2xl text-charcoal mb-1">
            {mode === "login" ? "Welcome back" : "Get your free evaluation"}
          </h1>
          <p className="text-sm text-charcoal/50 mb-6">
            {mode === "login"
              ? "Sign in to access your dashboard"
              : "New accounts get 1 free evaluation every month"}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-alert-red/10 border border-alert-red/20 rounded-lg text-sm text-alert-red">
              {error}
            </div>
          )}

          {notice && (
            <div className="mb-4 p-3 bg-forest/10 border border-forest/20 rounded-lg text-sm text-forest">
              {notice}
            </div>
          )}

          {(urlRef || showRefField) && (
            <div className="mb-4 p-3 bg-brass/5 border border-brass/20 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-brass tracking-wide uppercase">
                  Referral code — 10% off for life
                </label>
              </div>
              <input
                type="text"
                value={urlRef || referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                disabled={!!urlRef}
                className="w-full px-3 py-2 bg-white border border-brass/30 rounded-lg text-sm text-charcoal font-mono placeholder:text-charcoal/30 focus:outline-none focus:border-brass disabled:opacity-70"
                placeholder="e.g. SMIT4A2B"
              />
              <p className="text-xs text-charcoal/40 mt-1">
                {urlRef
                  ? "Code from your referral link applied automatically."
                  : "Enter a partner's code to get 10% off all credit purchases, permanently."}
              </p>
            </div>
          )}

          {!urlRef && !showRefField && (
            <button
              type="button"
              onClick={() => setShowRefField(true)}
              className="mb-4 text-xs text-brass hover:text-brass-dark transition font-medium"
            >
              + Have a referral code? Get 10% off for life
            </button>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-soft-mist border border-transparent rounded-lg text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:border-brass focus:bg-white transition"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-soft-mist border border-transparent rounded-lg text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:border-brass focus:bg-white transition"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-charcoal text-warm-stone font-medium rounded-lg hover:bg-charcoal-light transition disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-charcoal/40 mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}

