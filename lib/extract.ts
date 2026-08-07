'use client';

import * as pdfjsLib from 'pdfjs-dist';

// Set worker source — matches CaseLens approach (browser-side extraction)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export interface ExtractedFile {
  filename: string;
  text: string;
  pages: number;
}

/**
 * Extract text from a single file (PDF or image description).
 * Runs entirely client-side — the server never receives raw PDFs.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return extractTextFromPdf(file);
  } else if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx')
  ) {
    return extractTextFromDocx(file);
  } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    return file.text();
  } else if (fileType.startsWith('image/')) {
    // Images: return a placeholder — OCR happens server-side via vision model
    return `[Image file: ${file.name}]`;
  }

  throw new Error(`Unsupported file type: ${file.name}`);
}

async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let textContent = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const text = await page.getTextContent();
    textContent += text.items.map((item: any) => ('str' in item ? item.str : '')).join(' ');
    textContent += '\n\n';
  }

  return textContent.trim();
}

async function extractTextFromDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return value;
}
