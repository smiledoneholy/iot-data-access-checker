import { z } from "zod";
import { json, randomToken, readJson, sessionCookie, sha256, verifyPassword, type AppContext } from "../_utils";

const inputSchema = z.object({ email: z.email().max(254).transform((value) => value.toLowerCase()), password: z.string().min(1).max(128) });

export async function onRequestPost({ request, env }: AppContext): Promise<Response> {
  try {
    const input = inputSchema.parse(await readJson(request, 8_192));
    const user = await env.DB.prepare("SELECT id, email, password_hash FROM users WHERE email = ?").bind(input.email).first<{ id: string; email: string; password_hash: string }>();
    if (!user || !(await verifyPassword(input.password, user.password_hash))) return json({ error: "Invalid email or password." }, 401);
    const token = randomToken();
    await env.DB.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, datetime('now', '+30 days'))").bind(crypto.randomUUID(), user.id, await sha256(token)).run();
    return json({ user: { id: user.id, email: user.email } }, 200, { "Set-Cookie": sessionCookie(token) });
  } catch { return json({ error: "Invalid login request." }, 400); }
}
