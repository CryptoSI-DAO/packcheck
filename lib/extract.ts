import type { NextRequest } from "next/server";

export interface ExtractedFile {
  filename: string;
  text: string;
  pages: number;
}

/**
 * Extract text from uploaded files (PDF + images with OCR)
 */
export async function extractTextFromFiles(
  files: File[]
): Promise<{ text: string; fileCount: number }> {
  const results: ExtractedFile[] = [];

  for (const file of files) {
    try {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const text = await extractPdf(file);
        results.push({ filename: file.name, text, pages: 0 });
      } else if (file.type.startsWith("image/")) {
        // For images, use vision model via OpenRouter
        const text = await ocrImage(file);
        results.push({ filename: file.name, text, pages: 1 });
      }
    } catch (err) {
      console.error(`Failed to extract ${file.name}:`, err);
      results.push({ filename: file.name, text: `[Unreadable: ${file.name}]`, pages: 0 });
    }
  }

  const combined = results
    .map((r) => `--- ${r.filename} ---\n${r.text}`)
    .join("\n\n");

  return { text: combined, fileCount: results.length };
}

async function extractPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Dynamic import — pdf-parse's ESM types are broken, use require-style
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);

  return data.text || "[No text extracted from PDF]";
}

async function ocrImage(file: File): Promise<string> {
  // For V1, we send images to OpenRouter vision model
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = file.type;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "anthropic/claude-3.5-sonnet",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract ALL text from this document image. Preserve the structure and formatting as best you can. Output only the extracted text, nothing else.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64}`,
              },
            },
          ],
        },
      ],
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "[OCR failed]";
}
