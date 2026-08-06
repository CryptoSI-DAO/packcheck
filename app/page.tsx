import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-warm-stone">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-charcoal flex items-center justify-center">
            <span className="text-brass font-serif text-xl font-bold">M</span>
          </div>
          <div>
            <div className="font-serif text-lg text-charcoal leading-none">PackCheck</div>
            <div className="text-[10px] tracking-widest uppercase text-charcoal/50">by Mulcare Property</div>
          </div>
        </div>
        <Link
          href="/login"
          className="px-5 py-2 text-sm font-medium text-warm-stone bg-charcoal rounded-lg hover:bg-charcoal-light transition"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero */}
      <section className="px-6 md:px-12 pt-16 pb-24 max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-block px-3 py-1 mb-6 text-xs tracking-widest uppercase text-brass border border-brass/30 rounded-full">
            AI-Powered Property Pack Analysis
          </div>
          <h1 className="font-serif text-5xl md:text-6xl text-charcoal leading-tight mb-6">
            Know what you&apos;re buying
            <br />
            <span className="text-brass">before you sign.</span>
          </h1>
          <p className="text-lg text-charcoal/70 mb-10 max-w-xl mx-auto">
            Upload your property pack. Our AI reads every page and gives you 5 green flags,
            5 red flags, and a plain-English summary — in under 60 seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-4 bg-brass text-white font-medium rounded-lg hover:bg-brass-dark transition shadow-premium"
            >
              Get Started — 1 Free Evaluation
            </Link>
            <Link
              href="#how-it-works"
              className="px-8 py-4 text-charcoal font-medium rounded-lg border border-charcoal/15 hover:border-charcoal/30 transition"
            >
              How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-charcoal py-20">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <h2 className="font-serif text-3xl text-warm-stone text-center mb-16">
            Three simple steps
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { num: "1", title: "Upload", text: "Drag and drop your property pack PDFs or photos. Title deeds, EPCs, surveys — all welcome." },
              { num: "2", title: "AI Reads", text: "Our AI scans every page, cross-references details, and checks for the gotchas solicitors charge hundreds to find." },
              { num: "3", title: "Get Results", text: "Receive a clear report: 5 things that look great, 5 things to watch, and a plain-English summary." },
            ].map((step) => (
              <div key={step.num} className="text-center">
                <div className="w-12 h-12 mx-auto mb-5 rounded-full border-2 border-brass flex items-center justify-center">
                  <span className="text-brass font-serif text-xl">{step.num}</span>
                </div>
                <h3 className="font-serif text-xl text-warm-stone mb-3">{step.title}</h3>
                <p className="text-sm text-warm-stone/60 leading-relaxed">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Catch */}
      <section className="py-20 bg-soft-mist">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <h2 className="font-serif text-3xl text-charcoal text-center mb-4">
            The gotchas we catch
          </h2>
          <p className="text-center text-charcoal/60 mb-12 max-w-xl mx-auto">
            Red flags that hide in property packs, costing buyers thousands.
          </p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              "Short leases (< 80 years)",
              "Doubling ground rent clauses",
              "Poor EPC ratings (F or G)",
              "Subsidence & structural issues",
              "Flood risk (Zone 2/3)",
              "Restrictive covenants",
              "Missing building regulations",
              "High service charges",
              "Planning permission gaps",
            ].map((item) => (
              <div key={item} className="bg-white rounded-xl p-4 shadow-premium flex items-center gap-3">
                <span className="text-alert-red text-lg">🚩</span>
                <span className="text-sm text-charcoal/80">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-warm-stone">
        <div className="max-w-4xl mx-auto px-6 md:px-12">
          <h2 className="font-serif text-3xl text-charcoal text-center mb-4">
            Simple, honest pricing
          </h2>
          <p className="text-center text-charcoal/60 mb-12">
            One credit = one full property pack evaluation. First one&apos;s on us, every month.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="bg-white rounded-2xl p-8 shadow-premium text-center">
              <div className="text-xs tracking-widest uppercase text-brass mb-2">Free</div>
              <div className="font-serif text-4xl text-charcoal mb-1">£0</div>
              <div className="text-sm text-charcoal/50 mb-6">1 evaluation / month</div>
              <ul className="text-sm text-charcoal/70 space-y-2 text-left">
                <li className="flex gap-2"><span className="text-forest">✓</span> 1 free evaluation monthly</li>
                <li className="flex gap-2"><span className="text-forest">✓</span> Full report with all flags</li>
                <li className="flex gap-2"><span className="text-forest">✓</span> Resets on the 1st</li>
              </ul>
            </div>
            {/* Bundle 5 */}
            <div className="bg-charcoal rounded-2xl p-8 shadow-premium text-center relative -translate-y-2">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 bg-brass text-white text-xs rounded-full">
                Best Value
              </div>
              <div className="text-xs tracking-widest uppercase text-brass mb-2">10 Credits</div>
              <div className="font-serif text-4xl text-warm-stone mb-1">£10</div>
              <div className="text-sm text-warm-stone/50 mb-6">10 evaluations (£1 each)</div>
              <ul className="text-sm text-warm-stone/70 space-y-2 text-left">
                <li className="flex gap-2"><span className="text-forest">✓</span> 10 evaluations</li>
                <li className="flex gap-2"><span className="text-forest">✓</span> Credits never expire</li>
                <li className="flex gap-2"><span className="text-forest">✓</span> Last 5 reports saved</li>
                <li className="flex gap-2"><span className="text-forest">✓</span> Downloadable PDF reports</li>
              </ul>
            </div>
            {/* Bundle 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-premium text-center">
              <div className="text-xs tracking-widest uppercase text-brass mb-2">1 Credit</div>
              <div className="font-serif text-4xl text-charcoal mb-1">£1.50</div>
              <div className="text-sm text-charcoal/50 mb-6">1 evaluation</div>
              <ul className="text-sm text-charcoal/70 space-y-2 text-left">
                <li className="flex gap-2"><span className="text-forest">✓</span> 1 evaluation</li>
                <li className="flex gap-2"><span className="text-forest">✓</span> Full report</li>
                <li className="flex gap-2"><span className="text-forest">✓</span> Saved to your dashboard</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-charcoal py-20">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="font-serif text-3xl text-warm-stone mb-4">
            Don&apos;t sign blind.
          </h2>
          <p className="text-warm-stone/60 mb-8">
            Get your property pack checked in 60 seconds. Your first evaluation is free.
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-4 bg-brass text-white font-medium rounded-lg hover:bg-brass-dark transition"
          >
            Create Your Free Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-warm-stone py-8 border-t border-charcoal/10">
        <div className="max-w-6xl mx-auto px-6 md:px-12 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-charcoal/50">
            © 2026 Mulcare Property. PackCheck is an AI tool and does not constitute legal advice.
          </div>
        </div>
      </footer>
    </div>
  );
}
