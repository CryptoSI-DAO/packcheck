export interface PropertyFlag {
  title: string;
  detail: string;
  severity?: "low" | "medium" | "high";
}

export interface PropertyDetails {
  type?: string;
  address?: string;
  bedrooms?: string;
  bathrooms?: string;
  price?: string;
  tenure?: string;
  epc?: string;
}

export interface AnalysisResult {
  summary: string;
  propertyDetails: PropertyDetails;
  greenFlags: PropertyFlag[];
  redFlags: PropertyFlag[];
  documentsDetected: string[];
  overallVerdict: "green" | "amber" | "red";
}

const SYSTEM_PROMPT = `You are an expert property analyst. Your job is to read property packs (legal documents, EPCs, surveys, title deeds, etc.) and provide a clear, balanced evaluation.

CRITICAL RULES:
1. ONLY cite facts present in the document. If information is missing, say "Not found in pack."
2. NEVER make buy/don't-buy recommendations.
3. Use plain English — no jargon, no legalese.
4. Be specific and cite where in the pack you found each flag.
5. If the document is not a property pack, say so clearly.

Your response must be valid JSON with this exact structure:
{
  "summary": "2-3 paragraph plain-English summary of the property and what's in the pack",
  "propertyDetails": {
    "type": "e.g. Semi-detached, Flat, Terrace",
    "address": "Full address if found",
    "bedrooms": "Number as string or 'Not found'",
    "bathrooms": "Number as string or 'Not found'",
    "price": "e.g. £285,000 or 'Not found'",
    "tenure": "Freehold/Leasehold + years remaining if applicable",
    "epc": "Rating A-G or 'Not found'"
  },
  "greenFlags": [
    {"title": "Short headline", "detail": "1-2 sentence explanation"},
    ...exactly 5 items...
  ],
  "redFlags": [
    {"title": "Short headline", "detail": "1-2 sentence explanation", "severity": "low|medium|high"},
    ...exactly 5 items...
  ],
  "documentsDetected": ["List of document types found in the pack"],
  "overallVerdict": "green|amber|red"
}

VERDICT LOGIC:
- green: No high-severity red flags. Multiple green flags. Good overall package.
- amber: Some medium concerns or missing important documents. Generally OK but investigate.
- red: Any high-severity flag (short lease, structural issues, flood risk Zone 3, doubling ground rent, etc.)

RED FLAG SEVERITY:
- high: Short lease (<80yr), doubling ground rent, subsidence/heave, flood Zone 3, major structural defects
- medium: EPC D or E, missing building regs, restrictive covenants, moderate service charges, missing documents
- low: Minor issues, cosmetic, slightly above-average costs, things to monitor

If you genuinely cannot find 5 of each type, fill remaining slots with:
- Green: "Nothing notable" / Red: "No further concerns identified"

Always respond with ONLY valid JSON. No markdown, no code fences.`;

export async function analyzeProperty(text: string): Promise<AnalysisResult> {
  // Truncate to ~50K chars to stay within context limits
  const maxChars = 50000;
  const truncatedText =
    text.length > maxChars
      ? text.substring(0, maxChars) +
        "\n\n[NOTE: Document truncated for analysis. This is a partial view of a larger pack.]"
      : text;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://packcheck.mulcareproperty.com",
      "X-Title": "PackCheck",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      max_tokens: 4000,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Please analyze this property pack and provide your evaluation.\n\n=== PROPERTY PACK CONTENTS ===\n\n${truncatedText}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("OpenRouter error:", response.status, errText);
    throw new Error(`AI analysis failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("AI returned empty response");
  }

  // Parse the JSON response
  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as AnalysisResult;
  } catch {
    console.error("Failed to parse AI response:", content.substring(0, 500));
    throw new Error("AI returned invalid JSON");
  }
}
