import { z } from "zod";
import { json, readJson, requireUser, type AppContext } from "../_utils";

const reportSchema = z.object({
  documentTitle: z.string().min(1).max(200), openapiVersion: z.string().max(20), score: z.number().int().min(0).max(100), generatedAt: z.iso.datetime(),
  stats: z.object({ paths: z.number().int().nonnegative(), operations: z.number().int().nonnegative(), schemas: z.number().int().nonnegative() }),
  findings: z.array(z.object({ id: z.string().max(100), title: z.string().max(200), severity: z.enum(["pass", "warning", "critical"]), detail: z.string().max(2_000), recommendation: z.string().max(2_000).optional() })).max(100),
  disclaimer: z.string().max(1_000),
});

export async function onRequestGet({ request, env }: AppContext): Promise<Response> {
  const user = await requireUser(request, env);
  if (!user) return json({ error: "Authentication required." }, 401);
  const reports = await env.DB.prepare("SELECT id, title, score, created_at FROM reports WHERE user_id = ? ORDER BY created_at DESC LIMIT 50").bind(user.id).all();
  return json({ reports: reports.results });
}

export async function onRequestPost({ request, env }: AppContext): Promise<Response> {
  const user = await requireUser(request, env);
  if (!user) return json({ error: "Authentication required." }, 401);
  try {
    const report = reportSchema.parse(await readJson(request));
    const id = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO reports (id, user_id, title, score, report_json) VALUES (?, ?, ?, ?, ?)").bind(id, user.id, report.documentTitle, report.score, JSON.stringify(report)).run();
    return json({ id }, 201);
  } catch { return json({ error: "Invalid report." }, 400); }
}
