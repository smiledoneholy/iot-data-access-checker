import { getCookie, json, sessionCookie, sha256, type AppContext } from "../_utils";

export async function onRequestPost({ request, env }: AppContext): Promise<Response> {
  const token = getCookie(request, "session");
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
}
