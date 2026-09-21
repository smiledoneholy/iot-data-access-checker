export interface Env {
  DB: D1Database;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_ID?: string;
  APP_ORIGIN: string;
}

export type AppContext = EventContext<Env, string, Record<string, unknown>>;

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export async function readJson(request: Request, maxBytes = 256_000): Promise<unknown> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) throw new Error("PAYLOAD_TOO_LARGE");
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > maxBytes) throw new Error("PAYLOAD_TOO_LARGE");
  return JSON.parse(body);
}

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function randomToken(bytes = 32): string {
  const data = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...data)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function sha256(value: string): Promise<string> {
  return bytesToHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

export async function hashPassword(password: string, saltHex = bytesToHex(crypto.getRandomValues(new Uint8Array(16)).buffer)): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)));
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 310_000 }, key, 256);
  return `${saltHex}:${bytesToHex(bits)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, expected] = stored.split(":");
  if (!salt || !expected) return false;
  const actual = (await hashPassword(password, salt)).split(":")[1];
  let difference = actual.length ^ expected.length;
  for (let index = 0; index < Math.min(actual.length, expected.length); index++) difference |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}

export function getCookie(request: Request, name: string): string | null {
  const item = request.headers.get("cookie")?.split(";").map((value) => value.trim()).find((value) => value.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}

export async function requireUser(request: Request, env: Env): Promise<{ id: string; email: string } | null> {
  const token = getCookie(request, "session");
  if (!token) return null;
  const tokenHash = await sha256(token);
  return env.DB.prepare("SELECT users.id, users.email FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token_hash = ? AND sessions.expires_at > datetime('now')").bind(tokenHash).first<{ id: string; email: string }>();
}

export const sessionCookie = (token: string, maxAge = 60 * 60 * 24 * 30) => `session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
