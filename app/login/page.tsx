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
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const supabase = createClient();

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
        // After signup, session is usually created automatically
        router.push(redirect);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
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

