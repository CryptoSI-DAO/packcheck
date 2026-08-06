"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SelectedFile {
  file: File;
  preview: string;
}

const STATUS_MESSAGES = [
  "Reading title deeds...",
  "Checking EPC rating...",
  "Reviewing lease terms...",
  "Scanning for restrictive covenants...",
  "Cross-referencing property details...",
  "Checking for structural issues...",
  "Analyzing service charges...",
  "Compiling your report...",
];

export default function EvaluatePage() {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles: SelectedFile[] = [];
    for (const file of Array.from(fileList)) {
      if (file.size > 25 * 1024 * 1024) {
        setError(`${file.name} exceeds 25MB limit`);
        continue;
      }
      const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
      const validExt = /\.(pdf|jpe?g|png|webp)$/i.test(file.name);
      if (!validTypes.includes(file.type) && !validExt) {
        setError(`${file.name} is not supported. Use PDF, JPG, PNG, or WebP.`);
        continue;
      }
      newFiles.push({
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
      });
    }
    if (newFiles.length > 0) setError(null);
    setFiles((prev) => [...prev, ...newFiles].slice(0, 10));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  function removeFile(idx: number) {
    setFiles((prev) => {
      const updated = [...prev];
      if (updated[idx].preview) URL.revokeObjectURL(updated[idx].preview);
      updated.splice(idx, 1);
      return updated;
    });
  }

  async function handleAnalyze() {
    if (files.length === 0) return;
    setError(null);
    setAnalyzing(true);
    setStatusIndex(0);

    // Cycle status messages
    const statusInterval = setInterval(() => {
      setStatusIndex((prev) => (prev < STATUS_MESSAGES.length - 1 ? prev + 1 : prev));
    }, 2500);

    try {
      const formData = new FormData();
      for (const f of files) {
        formData.append("files", f.file);
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          router.push("/dashboard");
          return;
        }
        throw new Error(data.error || "Analysis failed");
      }

      // Store result in sessionStorage for the report page
      sessionStorage.setItem("latestReport", JSON.stringify(data));
      router.push(`/report/${data.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      setError(msg);
      setAnalyzing(false);
    } finally {
      clearInterval(statusInterval);
    }
  }

  // Analyzing state — full screen
  if (analyzing) {
    return (
      <div className="min-h-screen bg-charcoal flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          {/* Spinner */}
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-brass/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-brass rounded-full animate-spin"></div>
          </div>

          <h2 className="font-serif text-2xl text-warm-stone mb-3">Analyzing your pack</h2>
          <p className="text-warm-stone/50 text-sm mb-6">
            This usually takes 30-60 seconds
          </p>

          {/* Status messages */}
          <div className="h-6 flex items-center justify-center">
            <p key={statusIndex} className="text-brass text-sm fade-up">
              {STATUS_MESSAGES[statusIndex]}
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mt-8">
            {STATUS_MESSAGES.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition ${
                  i <= statusIndex ? "bg-brass" : "bg-warm-stone/20"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Upload state
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
            <div className="text-[9px] tracking-widest uppercase text-warm-stone/50">by Mulcare Property</div>
          </div>
        </Link>
        <Link href="/dashboard" className="text-sm text-warm-stone/60 hover:text-warm-stone transition">
          ← Back to Dashboard
        </Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 md:px-12 py-12">
        <h1 className="font-serif text-3xl text-charcoal mb-2">Upload Property Pack</h1>
        <p className="text-charcoal/50 mb-8">
          Drag and drop your documents. You can upload up to 10 files (PDF, JPG, PNG). Max 25MB each.
        </p>

        {error && (
          <div className="mb-6 p-4 bg-alert-red/10 border border-alert-red/20 rounded-lg text-sm text-alert-red">
            {error}
          </div>
        )}

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`drop-zone rounded-2xl p-12 text-center cursor-pointer transition ${
            dragging ? "drop-zone--active" : "bg-warm-stone"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <div className="text-5xl mb-4">📄</div>
          <p className="font-serif text-xl text-charcoal mb-2">
            Drop your property pack here
          </p>
          <p className="text-sm text-charcoal/50">
            or click to browse files
          </p>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-6 space-y-3 fade-up">
            {files.map((f, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 bg-white rounded-xl p-3 shadow-premium"
              >
                {f.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.preview} alt={f.file.name} className="w-12 h-12 object-cover rounded-lg" />
                ) : (
                  <div className="w-12 h-12 bg-alert-red/10 rounded-lg flex items-center justify-center text-xl">
                    📄
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-charcoal truncate">{f.file.name}</div>
                  <div className="text-xs text-charcoal/50">{(f.file.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                  className="text-charcoal/30 hover:text-alert-red transition text-lg"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {files.length > 0 && (
          <div className="mt-8 flex flex-col sm:flex-row gap-4 fade-up">
            <button
              onClick={handleAnalyze}
              className="flex-1 py-4 bg-charcoal text-warm-stone font-medium rounded-lg hover:bg-charcoal-light transition"
            >
              Analyze {files.length} file{files.length > 1 ? "s" : ""} (1 credit)
            </button>
            <button
              onClick={() => setFiles([])}
              className="px-6 py-4 text-charcoal border border-charcoal/15 rounded-lg hover:border-charcoal/30 transition"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-charcoal/40 mt-8">
          Your documents are processed securely and are not permanently stored on our servers.
          By using this tool, you acknowledge that the AI analysis is for informational purposes only
          and does not constitute legal advice.
        </p>
      </div>
    </div>
  );
}
