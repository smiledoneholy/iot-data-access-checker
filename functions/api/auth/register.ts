import { z } from "zod";
import { hashPassword, json, randomToken, readJson, sessionCookie, sha256, type AppContext } from "../_utils";

const inputSchema = z.object({ email: z.email().max(254).transform((value) => value.toLowerCase()), password: z.string().min(12).max(128) });

export async function onRequestPost({ request, env }: AppContext): Promise<Response> {
  try {
    const input = inputSchema.parse(await readJson(request, 8_192));
    const exists = await env.DB.prepare("SELECT 1 FROM users WHERE email = ?").bind(input.email).first();
    if (exists) return json({ error: "An account with this email already exists." }, 409);
    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(input.password);
    const token = randomToken();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)").bind(id, input.email, passwordHash),
      env.DB.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, datetime('now', '+30 days'))").bind(crypto.randomUUID(), id, await sha256(token)),
    ]);
    return json({ user: { id, email: input.email } }, 201, { "Set-Cookie": sessionCookie(token) });
  } catch { return json({ error: "Invalid registration request." }, 400); }
}
