import { json, requireUser, type AppContext } from "../_utils";

export async function onRequestGet({ request, env, params }: AppContext): Promise<Response> {
  const user = await requireUser(request, env);
  if (!user) return json({ error: "Authentication required." }, 401);
  const report = await env.DB.prepare("SELECT id, title, score, report_json, created_at FROM reports WHERE id = ? AND user_id = ?").bind(String(params.id), user.id).first<{ id: string; title: string; score: number; report_json: string; created_at: string }>();
  if (!report) return json({ error: "Report not found." }, 404);
  return json({ ...report, report: JSON.parse(report.report_json), report_json: undefined });
}
