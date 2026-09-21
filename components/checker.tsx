"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, FileJson, Loader2, Save, ShieldCheck } from "lucide-react";
import { z } from "zod";
import type { SessionUser } from "@/components/account-bar";
import { analyzeOpenApi } from "@/lib/openapi/analyzer";
import { parseOpenApiText, MAX_SPEC_BYTES } from "@/lib/openapi/parser";
import type { AnalysisResult } from "@/lib/openapi/types";

const example = `openapi: 3.1.0
info:
  title: Connected Thermostat API
  version: 1.0.0
security:
  - oauth: [data:read]
paths:
  /devices/{deviceId}/measurements:
    get:
      summary: Retrieve device measurements
      responses:
        "200":
          description: Measurement history
components:
  securitySchemes:
    oauth:
      type: oauth2
      flows:
        clientCredentials:
          tokenUrl: https://example.com/oauth/token
          scopes:
            data:read: Read device data
`;

function downloadPdf(result: AnalysisResult) {
  import("jspdf").then(({ jsPDF }) => {
    const pdf = new jsPDF();
    pdf.setFontSize(18); pdf.text("IoT Data Access Checker", 18, 20);
    pdf.setFontSize(12); pdf.text(`${result.documentTitle} — Technical score: ${result.score}/100`, 18, 32);
    let y = 44;
    for (const finding of result.findings) {
      const lines = pdf.splitTextToSize(`${finding.severity.toUpperCase()}: ${finding.title} — ${finding.detail}`, 174);
      if (y + lines.length * 6 > 270) { pdf.addPage(); y = 20; }
      pdf.text(lines, 18, y); y += lines.length * 6 + 5;
    }
    pdf.setFontSize(9);
    const disclaimer = pdf.splitTextToSize(result.disclaimer, 174);
    if (y + disclaimer.length * 5 > 280) { pdf.addPage(); y = 20; }
    pdf.text(disclaimer, 18, y + 6);
    pdf.save("iot-technical-analysis.pdf");
  });
}

export function Checker({ user }: { user: SessionUser | null }) {
  const [source, setSource] = useState(example);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function runAnalysis() {
    setBusy(true); setError(""); setSaveState("idle");
    try { setResult(analyzeOpenApi(parseOpenApiText(source))); }
    catch (reason) { setResult(null); setError(reason instanceof z.ZodError ? reason.issues[0]?.message ?? "Invalid OpenAPI document." : reason instanceof Error ? reason.message : "Unable to analyze this document."); }
    finally { setBusy(false); }
  }

  async function saveReport() {
    if (!result || !user) return;
    setSaveState("saving");
    try {
      const response = await fetch("/api/reports", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(result) });
      if (!response.ok) throw new Error("Unable to save the report.");
      setSaveState("saved");
    } catch { setSaveState("error"); }
  }

  async function loadFile(file?: File) {
    if (!file) return;
    if (file.size > MAX_SPEC_BYTES) { setError("The document exceeds the 2 MB limit."); return; }
    const allowed = [".json", ".yaml", ".yml"];
    if (!allowed.some((extension) => file.name.toLowerCase().endsWith(extension))) { setError("Use a .json, .yaml, or .yml file."); return; }
    setSource(await file.text()); setResult(null); setError("");
  }

  return (
    <section className="grid gap-8 lg:grid-cols-[1.05fr_.95fr]">
      <div className="rounded-3xl border border-slate-700/70 bg-slate-900/70 p-5 shadow-2xl shadow-cyan-950/30">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold">OpenAPI document</h2><p className="text-sm text-slate-400">JSON or YAML · 2 MB maximum</p></div>
          <label className="cursor-pointer rounded-xl border border-slate-600 px-4 py-2 text-sm hover:bg-slate-800">
            Upload file<input className="hidden" type="file" accept=".json,.yaml,.yml" onChange={(event) => loadFile(event.target.files?.[0])} />
          </label>
        </div>
        <textarea aria-label="OpenAPI document" value={source} onChange={(event) => setSource(event.target.value)} spellCheck={false} className="h-[430px] w-full resize-y rounded-2xl border border-slate-700 bg-[#050b14] p-4 font-mono text-sm leading-6 text-slate-200 outline-none focus:border-cyan-400" />
        {error && <p role="alert" className="mt-3 flex gap-2 text-sm text-rose-300"><AlertTriangle size={18} />{error}</p>}
        <button onClick={runAnalysis} disabled={busy} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60">
          {busy ? <Loader2 className="animate-spin" size={19} /> : <ShieldCheck size={19} />} Analyze documentation
        </button>
        <p className="mt-3 text-xs text-slate-500">Processing occurs in your browser. External OpenAPI references are detected but never fetched.</p>
      </div>

      <div className="rounded-3xl border border-slate-700/70 bg-slate-900/70 p-6">
        {!result ? <div className="flex h-full min-h-96 flex-col items-center justify-center text-center"><FileJson size={52} className="mb-5 text-cyan-400" /><h2 className="text-xl font-semibold">Your technical report appears here</h2><p className="mt-2 max-w-sm text-slate-400">Review API discoverability, authentication documentation, responses, descriptions, and reference safety.</p></div> : <>
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-700 pb-5"><div><p className="text-sm text-slate-400">Technical readiness score</p><p className="text-5xl font-bold text-cyan-300">{result.score}<span className="text-xl text-slate-500">/100</span></p></div><div className="flex flex-wrap gap-2"><button onClick={() => downloadPdf(result)} className="rounded-xl border border-cyan-500/50 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-950">Download PDF</button>{user && <button onClick={saveReport} disabled={saveState === "saving" || saveState === "saved"} className="flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"><Save size={16} />{saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save privately"}</button>}</div></div>
          {!user && <p className="mt-3 text-xs text-slate-400">Sign in to save this report privately.</p>}
          {saveState === "error" && <p role="alert" className="mt-3 text-sm text-rose-300">The report could not be saved. Please sign in again and retry.</p>}
          <div className="my-5 grid grid-cols-3 gap-3 text-center text-sm"><div className="rounded-xl bg-slate-800 p-3"><b className="block text-xl">{result.stats.paths}</b>Paths</div><div className="rounded-xl bg-slate-800 p-3"><b className="block text-xl">{result.stats.operations}</b>Operations</div><div className="rounded-xl bg-slate-800 p-3"><b className="block text-xl">{result.stats.schemas}</b>Schemas</div></div>
          <div className="space-y-3">{result.findings.map((finding) => <article key={finding.id} className="rounded-xl border border-slate-700 p-4"><div className="flex gap-3">{finding.severity === "pass" ? <CheckCircle2 className="shrink-0 text-emerald-400" size={20} /> : <AlertTriangle className={finding.severity === "critical" ? "shrink-0 text-rose-400" : "shrink-0 text-amber-400"} size={20} />}<div><h3 className="font-medium">{finding.title}</h3><p className="mt-1 text-sm text-slate-400">{finding.detail}</p></div></div></article>)}</div>
          <p className="mt-5 rounded-xl bg-amber-950/40 p-3 text-xs leading-5 text-amber-100">{result.disclaimer}</p>
        </>}
      </div>
    </section>
  );
}
