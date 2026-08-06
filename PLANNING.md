# Mulcare Property Pack Evaluator — Complete Product Specification

## Product Overview

A premium, paid AI tool that reads property packs (PDFs, photos) and gives buyers an instant, plain-English evaluation — highlighting what's great, what's risky, and what gotchas might be hiding in the fine print.

**One-liner:** Upload your property pack. Know what you're buying before you sign.

**Business model:** Credit-based. ~£1 per evaluation. 1 free evaluation/month for registered users. Credits purchased via Stripe.

---

## The Problem

Property packs are dense — 50+ pages of legalese, surveys, EPCs, title deeds, and listings. Most buyers skim them or don't read them at all. Solicitors charge £200-500 to review them and take days. Buyers miss red flags until it's too late: short leases, structural issues, flood risk, restrictive covenants, unreasonable service charges.

## The Solution

A paid tool that:
1. Requires authentication (Supabase)
2. Accepts a property pack (multiple PDFs and/or photos)
3. Costs 1 credit per evaluation (~£1, or use free monthly allowance)
4. Extracts and reads every page
5. Returns a clear, branded evaluation report:
   - **Plain-English summary** of what the property is and what's included
   - **5 Green Flags** — strong positives about the property/deal
   - **5 Red Flags** — things to watch out for, investigate, or negotiate on
6. Saves report to user's dashboard (last 5 retained)
7. Report is downloadable as PDF

---

## Target Users

| User | Use Case |
|------|----------|
| **Home buyers** | Uploaded the pack their solicitor/agent sent — want a quick second opinion before proceeding |
| **Property investors** | Evaluating multiple deals fast — need to filter the good from the risky |
| **Mulcare clients** | Use as part of Mulcare's advisory service — professional-grade tool |

---

## Authentication & User System

### Provider: Supabase (self-hosted, already configured)

- **URL:** `https://db.cryptosidao.org`
- **Auth method:** Email/password (GoTrue)
- **Session management:** Supabase client SDK + server-side cookies
- **User table:** `auth.users` (managed by Supabase)
- **Profile table:** `evaluator_profiles` (custom — credits, free tier tracking)

### Auth Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Landing     │────▶│  Login /     │────▶│  Dashboard       │
│  Page        │     │  Sign Up     │     │  (credits,       │
│  (marketing) │     │  Page        │     │   history,       │
└──────────────┘     └──────────────┘     │   new eval)      │
                                          └──────────────────┘
```

- Unauthenticated users see marketing landing page with pricing
- "Get Started" → redirects to login/signup
- New accounts get **1 free credit** immediately on signup
- Free credit resets to 1 on the 1st of each month (unused doesn't roll over)
- Additional credits purchased via Stripe

---

## Credit System & Payments

### Credit Mechanics

| Mechanism | Detail |
|-----------|--------|
| **Free tier** | 1 free evaluation per calendar month (resets on 1st) |
| **Free credit expiry** | Does NOT roll over — resets to 1 each month |
| **Paid credits** | Purchased in bundles via Stripe, never expire |
| **Cost per evaluation** | 1 credit = 1 evaluation (~£1.00) |
| **Credit bundles** | 1 credit = £1.50 · 5 credits = £6.00 · 10 credits = £10.00 (bulk discount) |
| **Credit consumption** | Deducted on successful AI analysis only (not on upload failure) |

### Pricing Logic

- £1.50 for a single credit gives margin over the ~$0.02-0.05 API cost
- Bulk discount (10 for £10 = £1.00 each) rewards repeat users
- Free monthly evaluation hooks users — if the tool is good, they'll buy more

### Stripe Integration

| Item | Detail |
|------|--------|
| **Payment provider** | Stripe Checkout (hosted payment page) |
| **Webhook** | `/api/stripe/webhook` — listens for `checkout.session.completed` |
| **Credit top-up** | On successful payment, credits added to `evaluator_profiles.credits` |
| **Products** | Created in Stripe dashboard: `eval-1`, `eval-5`, `eval-10` |
| **Currency** | GBP (£) |
| **No subscriptions** | V1 is one-off credit purchases only. Subscriptions (unlimited plan) possible in Phase 2 |

### Purchase Flow

```
Dashboard → "Buy Credits" → Select bundle → Stripe Checkout → 
Webhook fires → Credits added → Redirect back to dashboard with confirmation
```

---

## Database Schema

### Supabase Tables

#### `evaluator_profiles`
Links to `auth.users`. Tracks credits and free tier.

```sql
CREATE TABLE evaluator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL DEFAULT 0,
  free_credit_used_this_month BOOLEAN NOT NULL DEFAULT false,
  free_credit_reset_month INTEGER NOT NULL DEFAULT EXTRACT(MONTH FROM NOW())::INT,
  free_credit_reset_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);
```

- New users: `credits = 0`, `free_credit_used_this_month = false`
- On evaluation: check free credit first, then paid credits
- Monthly reset: if `reset_month < current_month`, set `free_credit_used_this_month = false`
- Auto-create profile on signup via database trigger

#### `evaluator_reports`
Stores the last 5 reports per user (enforced in app logic).

```sql
CREATE TABLE evaluator_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_data JSONB NOT NULL,
  property_address TEXT,
  property_type TEXT,
  overall_verdict TEXT,
  file_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- `report_data` stores the full AI response (summary, green flags, red flags, property details)
- `property_address` and `property_type` extracted for dashboard display
- When user has 5 reports and creates a 6th, the oldest is deleted
- Indexed on `user_id` + `created_at DESC`

### Row Level Security (RLS)

```sql
-- Users can only see their own profiles and reports
ALTER TABLE evaluator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluator_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own profile" ON evaluator_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users own reports" ON evaluator_reports
  FOR ALL USING (auth.uid() = user_id);
```

---

## User Flow (Complete)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         UNAUTHENTICATED                             │
│                                                                     │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────────┐     │
│  │  Landing    │───▶│  Pricing     │───▶│  Login / Sign Up   │     │
│  │  Page       │    │  (credit     │    │  (Supabase Auth)   │     │
│  │  (marketing)│    │   bundles)   │    │                    │     │
│  └─────────────┘    └──────────────┘    └─────────┬──────────┘     │
│                                                   │                 │
└───────────────────────────────────────────────────┼─────────────────┘
                                                    │
┌───────────────────────────────────────────────────┼─────────────────┐
│                         AUTHENTICATED              ▼                 │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     DASHBOARD                                │  │
│  │                                                              │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │  │
│  │  │ Credit      │  │ New          │  │ Report History    │   │  │
│  │  │ Balance:    │  │ Evaluation   │  │ (last 5 reports)  │   │  │
│  │  │ 1 free +    │  │ ────────────▶│  │                   │   │  │
│  │  │ 3 paid      │  │ Upload Pack  │  │  📄 12 Aug - 3bed │   │  │
│  │  │             │  │              │  │  📄 08 Aug - 2bed │   │  │
│  │  │ [Buy More]  │  │              │  │  📄 01 Aug - flat │   │  │
│  │  └─────────────┘  └──────┬───────┘  └─────────┬─────────┘   │  │
│  └──────────────────────────┼────────────────────┼─────────────┘  │
│                             │                    │                 │
│                             ▼                    ▼                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐        │
│  │  Upload      │───▶│  Analyzing   │───▶│  Results     │        │
│  │  Multiple    │    │  (15-30s     │    │  Report      │        │
│  │  files OK    │    │   loading)   │    │  + Download  │        │
│  │  PDF/IMG     │    │              │    │  + Save to   │        │
│  │              │    │              │    │    history   │        │
│  └──────────────┘    └──────────────┘    └──────┬───────┘        │
│                                                  │                 │
│                                          Back to dashboard        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Step-by-step:

1. **Landing page** — Mulcare-branded marketing page. Explains the tool, shows pricing, CTA to sign up. No access without auth.

2. **Auth** — Email/password signup or login via Supabase. New users get profile auto-created with free tier.

3. **Dashboard** — Shows:
   - Credit balance (free + paid)
   - "New Evaluation" button (disabled if 0 credits)
   - "Buy Credits" button → Stripe bundles
   - Report history (last 5, clickable to re-view/download)

4. **Upload** — Drag & drop multiple files (PDF, JPG, PNG). Each file validated (max 25MB per file, max 10 files). Preview thumbnails. On submit, credit is reserved.

5. **Analyzing** — Full-screen branded loading. Status messages cycle: "Reading title deeds... Checking EPC rating... Reviewing lease terms..."

6. **Results Report** — Clean, scannable:
   - **Property Summary** (2-3 paragraphs)
   - **5 Green Flags** ✅ with explanations
   - **5 Red Flags** 🚩 with severity (Low/Medium/High)
   - **Overall Verdict** (🟢/🟡/🔴)
   - **Disclaimer**: "AI-generated summary, not legal advice"
   - Actions: "Download PDF Report" / "Evaluate Another Pack"

7. **Report saved** — Automatically stored to `evaluator_reports`. If user now has >5, oldest deleted.

---

## AI Analysis Engine

### What the AI extracts & evaluates:

**Property basics:**
- Address, property type (detached/semi/flat/etc.)
- Bedrooms, bathrooms, square footage
- Asking price / offer price
- Tenure (freehold/leasehold)
- Lease length remaining (if leasehold)

**Documents detected:**
- Title deeds / Land Registry
- EPC (Energy Performance Certificate) + rating
- Homebuyer survey / structural report
- Floor plans
- TA6/TA7/TA10 forms (property information forms)
- Service charge / ground rent details (if leasehold)
- Planning permissions / building regulations

**Red flag detection (the core value):**
- Short lease (< 80 years remaining)
- High ground rent / doubling clauses
- Poor EPC rating (F or G)
- Structural issues (subsidence, damp, Japanese knotweed)
- Flood risk (Zone 2/3)
- Restrictive covenants
- Unusual service charges or management fees
- Missing documentation
- Planning permission gaps
- Easements / rights of way issues

**Green flag detection:**
- Long lease (999 years or share of freehold)
- Good EPC rating (A-C)
- Recent renovations with building regs sign-off
- Chain-free / vacant possession
- Strong transport links mentioned
- Good council tax band
- Peppercorn ground rent
- NHBC Warranty or similar
- Recent boiler/electrical certification
- Clear title, no unusual restrictions

### AI Prompt Strategy

The AI receives the full extracted text and is prompted to:

1. **Identify** the property and its key facts
2. **Analyze** for risks and benefits across defined categories
3. **Rank** and select the top 5 of each
4. **Explain** each in plain English (no jargon, no legalese)
5. **Assign severity** to red flags (Low/Medium/High)
6. **Only cite facts present** — if missing, state "Not found in pack"

### Model Selection

- **V1:** GLM-4.6 or GPT-4o via OpenRouter — proven document analysis, large context window
- **Context window:** Property packs can be 20-50 pages. Need 30K-50K tokens
- **Multi-file handling:** All files extracted, text concatenated in upload order, single AI call
- **Fallback:** If document too large, summarize in chunks then combine

---

## Technical Architecture

### Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 15 + TypeScript + Tailwind | Matches existing Mulcare stack |
| **Auth** | Supabase (self-hosted) | Already configured, proven on other projects |
| **File upload** | Next.js API route + multipart parser | Handle multiple files |
| **PDF extraction** | `pdf-parse` | Server-side text extraction |
| **Image OCR** | Vision model via OpenRouter (if photos uploaded) | For photographed documents |
| **AI analysis** | OpenRouter API (GLM-4.6 / GPT-4o) | Proven, already configured |
| **Payments** | Stripe Checkout + Webhooks | Industry standard, simple credit system |
| **Database** | Supabase PostgreSQL | Profiles, credits, reports |
| **Report storage** | JSONB in Supabase (report_data column) | No separate file storage needed for V1 |
| **PDF report gen** | WeasyPrint (already installed) | Branded downloadable report |
| **Hosting** | Vercel | Matches existing Mulcare deployment |

### Data Flow

```
User uploads files (authenticated)
       │
       ▼
Check credits (free first, then paid) → deny if 0
       │
       ▼
Next.js API route receives files
       │
       ▼
Extract text from all PDFs / OCR all images
       │
       ▼
Concatenate all text → single document
       │
       ▼
Send to OpenRouter AI with system prompt
       │
       ▼
AI returns JSON: { summary, greenFlags[], redFlags[], propertyDetails }
       │
       ▼
Deduct 1 credit (free if available, else paid)
       │
       ▼
Save report to evaluator_reports (delete oldest if >5)
       │
       ▼
Frontend renders branded evaluation report
       │
       ▼
Optional: User downloads PDF via WeasyPrint
```

### Credit Deduction Logic

```
on successful AI response:

1. Check if free credit available:
   - Is free_credit_reset_month < current_month? → reset free_credit_used = false
   - Is free_credit_used_this_month == false? → use free credit, set flag true

2. Else check paid credits:
   - Is credits > 0? → decrement credits by 1

3. Else: should not reach here (UI blocks at 0 credits, but server validates too)
   - Return 402 Payment Required
```

---

## Dashboard Design

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  MULCARE PROPERTY EVALUATOR              [user@email]   │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  ┌─────────────┐  ┌──────────────────────────────────┐  │
│  │  CREDITS    │  │  REPORT HISTORY                  │  │
│  │             │  │                                  │  │
│  │  🎁 1 free  │  │  📄 3-bed Semi, Manchester       │  │
│  │     available│  │     12 Aug 2026 · 🟡 Amber      │  │
│  │             │  │     [View] [Download]            │  │
│  │  💰 3 paid  │  │                                  │  │
│  │     credits │  │  📄 2-bed Flat, Leeds            │  │
│  │             │  │     08 Aug 2026 · 🟢 Green       │  │
│  │  ┌────────┐ │  │     [View] [Download]            │  │
│  │  │BUY MORE│ │  │                                  │  │
│  │  └────────┘ │  │  📄 Studio, Birmingham           │  │
│  └─────────────┘  │     01 Aug 2026 · 🔴 Red         │  │
│                   │     [View] [Download]            │  │
│  ┌─────────────────────────────────────────────────┐ │  │
│  │  + NEW EVALUATION                               │ │  │
│  │  Upload a property pack to analyze              │ │  │
│  └─────────────────────────────────────────────────┘ │  │
│                                                   ────│ │
│                                                       │ │
└─────────────────────────────────────────────────────────┘
```

### Report History Item

Each history entry shows:
- Property type + address (or first line detected)
- Date of evaluation
- Overall verdict (traffic light)
- Buttons: View (re-renders report) / Download (PDF)

Clicking a historical report renders the same results page — no re-processing needed.

---

## Stripe Setup Requirements

### Stripe Dashboard Configuration

1. **Products to create:**

| Product Name | Price | Credits |
|---|---|---|
| 1 Evaluation | £1.50 | 1 |
| 5 Evaluations | £6.00 | 5 |
| 10 Evaluations | £10.00 | 10 |

2. **Webhook endpoint:** `https://[domain]/api/stripe/webhook`
   - Event: `checkout.session.completed`
   - On event: parse `client_reference_id` (user_id), add credits to profile

3. **Environment variables needed:**
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whct_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

4. **Checkout flow:**
   - User clicks "Buy Credits" → selects bundle
   - Server creates Stripe Checkout Session with `client_reference_id = user_id`
   - Redirect to Stripe hosted checkout
   - On success: redirect to `/dashboard?credits=added`
   - Webhook fires → credits added to DB

---

## Mulcare Branding

### Visual System (from mulcareblueprint.md)

| Token | Value |
|-------|-------|
| Charcoal | `#1F2326` |
| Warm stone | `#F6F1EB` |
| Soft mist | `#EEF2F4` |
| Brass accent | `#B8905B` |
| Forest accent | `#2F4A3A` |
| Headline font | Cormorant Garamond |
| Body font | Source Sans 3 / IBM Plex Sans |

### UI Components

- **Landing:** Charcoal hero with brass CTA, pricing cards on warm stone
- **Auth pages:** Clean, minimal, warm stone background
- **Dashboard:** Soft mist background, charcoal cards, brass accents
- **Upload zone:** Dashed border in brass, warm stone background
- **Loading state:** Charcoal background with brass spinner, cycling status messages
- **Report:** Warm stone background, clean card layout, brass section headers
- **Green flags:** Forest green `#2F4A3A` with checkmark icons
- **Red flags:** Warm amber/red `#C0392B` with warning icons
- **Verdict badges:** Green `#2F4A3A` / Amber `#B8905B` / Red `#C0392B`
- **Credit display:** Gift icon for free, coin icon for paid

---

## Phased Delivery

### Phase 1 — MVP (Paid product, core functionality)
- [ ] Landing page with Mulcare branding + pricing
- [ ] Supabase auth (login/signup)
- [ ] Dashboard (credit balance, new evaluation, report history)
- [ ] Profile auto-creation on signup (trigger)
- [ ] Free tier logic (1/month reset)
- [ ] Multiple file upload + text extraction (PDF)
- [ ] AI analysis endpoint (summary + 5 green + 5 red)
- [ ] Results page with branded report
- [ ] Report saving to Supabase (max 5 per user)
- [ ] Loading animation during processing
- [ ] Stripe Checkout integration (3 bundles)
- [ ] Stripe webhook for credit top-up
- [ ] Deploy to Vercel

### Phase 2 — Polish
- [ ] Downloadable PDF report (WeasyPrint)
- [ ] Image/photo upload support (OCR via vision model)
- [ ] Severity indicators on red flags (Low/Med/High)
- [ ] Overall verdict score (traffic light)
- [ ] Email report to self / solicitor

### Phase 3 — Growth
- [ ] Side-by-side comparison of multiple packs
- [ ] Subscription plan (unlimited evaluations for £X/month)
- [ ] Mulcare agent dashboard (white-label)
- [ ] API for integration into Mulcare's existing tools
- [ ] Team accounts (shared credit pool)

---

## Risk Considerations

| Risk | Mitigation |
|------|-----------|
| **Legal liability** | Clear disclaimer: "AI-generated summary, not legal advice." Never make buy/don't-buy recommendations |
| **AI hallucination** | Prompt instructs: "Only cite facts present in the document. If missing, state 'Not found in pack.'" |
| **Large PDFs** | Chunk summarization strategy for 50+ page packs |
| **Poor quality scans** | Graceful degradation: "Some pages were unreadable. Manual review recommended." |
| **Privacy** | Reports stored as JSONB in Supabase behind RLS. Uploaded files processed in memory, not persisted to disk |
| **Stripe failure** | Credits only added on webhook confirmation, not on redirect. Idempotent webhook handler |
| **Credit fraud** | Server-side credit validation on every evaluation request. Never trust client-side credit count |
| **Free tier abuse** | Tied to auth.users ID. One free credit per account per month. Email verification required |

---

## File Structure

```
mulcare-property-evaluator/
├── app/
│   ├── layout.tsx                  # Root layout, fonts, Supabase provider
│   ├── page.tsx                    # Landing page (marketing + pricing)
│   ├── login/
│   │   └── page.tsx                # Login/signup
│   ├── dashboard/
│   │   └── page.tsx                # Credit balance + history + new eval
│   ├── evaluate/
│   │   └── page.tsx                # Upload zone + analyzing state
│   ├── report/
│   │   └── [id]/
│   │       └── page.tsx            # Results report view
│   ├── checkout/
│   │   └── route.ts                # Stripe Checkout redirect
│   └── api/
│       ├── analyze/
│       │   └── route.ts            # Upload + extract + AI analysis
│       └── stripe/
│           └── webhook.ts          # Stripe webhook handler
├── components/
│   ├── UploadZone.tsx              # Multi-file drag & drop
│   ├── Analyzing.tsx               # Loading animation
│   ├── ReportSummary.tsx           # Property summary section
│   ├── GreenFlags.tsx              # 5 positives
│   ├── RedFlags.tsx                # 5 concerns
│   ├── CreditBalance.tsx           # Credit display widget
│   ├── ReportHistory.tsx           # Dashboard history list
│   ├── PricingCards.tsx            # Credit bundle cards
│   └── Disclaimer.tsx              # Legal disclaimer
├── lib/
│   ├── supabase-client.ts          # Browser Supabase client
│   ├── supabase-server.ts          # Server Supabase client
│   ├── extract-pdf.ts              # PDF text extraction
│   ├── analyze.ts                  # AI prompt + OpenRouter call
│   ├── credits.ts                  # Credit check/deduct logic
│   └── stripe.ts                   # Stripe client + bundle config
├── middleware.ts                    # Auth guard for /dashboard, /evaluate, /report
├── public/
│   └── (mulcare logos/assets)
└── package.json
```

---

## API Design

### POST `/api/analyze`

**Auth:** Required (Supabase session cookie)

**Request:**
```
Content-Type: multipart/form-data
Body: files[] (PDF/JPG/PNG, max 25MB each, max 10 files)
```

**Logic:**
1. Verify auth → get user_id
2. Check credits (free first, then paid) → 402 if insufficient
3. Extract text from all files
4. Call AI analysis
5. Deduct credit
6. Save report to `evaluator_reports` (trim to 5)
7. Return result

**Response (200):**
```json
{
  "id": "uuid",
  "summary": "3-bedroom semi-detached house in Manchester...",
  "propertyDetails": {
    "type": "Semi-detached",
    "address": "12 Example Road, Manchester",
    "bedrooms": 3,
    "bathrooms": 2,
    "price": "£285,000",
    "tenure": "Freehold",
    "epc": "C"
  },
  "greenFlags": [
    {
      "title": "Freehold tenure",
      "detail": "No ground rent or landlord obligations."
    }
  ],
  "redFlags": [
    {
      "title": "EPC rating of D",
      "detail": "Below the new minimum EPC C requirement coming in 2027.",
      "severity": "medium"
    }
  ],
  "documentsDetected": ["Title deeds", "EPC certificate", "Floor plan"],
  "overallVerdict": "amber",
  "creditsRemaining": {
    "free": 0,
    "paid": 2
  }
}
```

**Error responses:**
- 401: Not authenticated
- 402: Insufficient credits
- 400: Invalid file type / size exceeded
- 422: Could not extract text (corrupt/unreadable)
- 500: AI analysis failed (credit NOT deducted)

### GET `/api/reports/[id]`

Returns a saved report by ID. Only accessible by the report owner (RLS enforced).

### POST `/api/stripe/checkout`

Creates a Stripe Checkout Session for a credit bundle. Requires auth.

**Request:**
```json
{ "bundle": "eval-5" }
```

**Response:**
```json
{ "url": "https://checkout.stripe.com/..." }
```

### POST `/api/stripe/webhook`

Receives Stripe webhook. Adds credits on successful payment. No auth (Stripe-signed).

---

## Cost Analysis

| Item | Cost |
|------|------|
| Vercel hosting | Free tier (sufficient for MVP) |
| OpenRouter API | ~$0.02-0.05 per evaluation |
| Supabase | Self-hosted (no additional cost) |
| Stripe fees | 1.5% + 20p per transaction (UK) |
| **Per-evaluation cost** | **~$0.05 + Stripe fees** |
| **Revenue per credit** | **£1.00-1.50** |
| **Gross margin** | **~90%+** |

At £1.50/credit:
- 100 evaluations/month = £150 revenue, ~£10 costs → £140 profit
- 500 evaluations/month = £750 revenue, ~£35 costs → £715 profit

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://db.cryptosidao.org
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon key from existing projects]
SUPABASE_SERVICE_ROLE_KEY=[service role key]

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whct_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# OpenRouter
OPENROUTER_API_KEY=[from /opt/hermes-agents/data/.env]

# App
NEXT_PUBLIC_APP_URL=https://packcheck.mulcareproperty.com
```

---

## SQL Setup Script

Run once to create tables, triggers, and RLS policies:

```sql
-- Profiles table
CREATE TABLE evaluator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits INTEGER NOT NULL DEFAULT 0,
  free_credit_used_this_month BOOLEAN NOT NULL DEFAULT false,
  free_credit_reset_month INTEGER NOT NULL DEFAULT EXTRACT(MONTH FROM NOW())::INT,
  free_credit_reset_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Reports table
CREATE TABLE evaluator_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_data JSONB NOT NULL,
  property_address TEXT,
  property_type TEXT,
  overall_verdict TEXT,
  file_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO evaluator_profiles (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Indexes
CREATE INDEX idx_reports_user ON evaluator_reports(user_id, created_at DESC);

-- RLS
ALTER TABLE evaluator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluator_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own profile" ON evaluator_profiles
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own reports" ON evaluator_reports
  FOR ALL USING (auth.uid() = user_id);
```

---

## Confirmed Decisions

1. **Stripe account:** ✅ Existing account already configured (used by Strait Crisis Dashboard). Keys stored as sensitive Vercel env vars — need user to provide `STRIPE_SECRET_KEY` when we reach the payment integration step.

2. **Domain:** ✅ `packcheck.mulcareproperty.com` (subdomain of existing Mulcare domain)

3. **Free credit timing:** ✅ New users get free eval immediately on signup. Resets on 1st of each month. Unused doesn't roll over.

4. **Report retention:** ✅ Last 5 reports per user. Viewable + downloadable from dashboard.

---

*Document version: 2.0 — August 2026*
*Author: Lisa Kim for CryptoSI DAO*
