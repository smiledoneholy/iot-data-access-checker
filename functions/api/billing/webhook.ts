import { json, type AppContext } from "../_utils";

function parseSignature(header: string): { timestamp: string; signatures: string[] } | null {
  const values = Object.fromEntries(header.split(",").map((part) => part.split("=", 2)));
  const signatures = header.split(",").filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  return values.t && signatures.length ? { timestamp: values.t, signatures } : null;
}

function constantTimeEqual(a: string, b: string): boolean {
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.min(a.length, b.length); index++) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
}

export async function onRequestPost({ request, env }: AppContext): Promise<Response> {
  if (!env.STRIPE_WEBHOOK_SECRET) return json({ error: "Webhook is not configured." }, 503);
  const rawBody = await request.text();
  const parsed = parseSignature(request.headers.get("stripe-signature") ?? "");
  if (!parsed || Math.abs(Date.now() / 1000 - Number(parsed.timestamp)) > 300) return json({ error: "Invalid signature." }, 400);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${parsed.timestamp}.${rawBody}`));
  const expected = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  if (!parsed.signatures.some((signature) => constantTimeEqual(signature, expected))) return json({ error: "Invalid signature." }, 400);
  const event = JSON.parse(rawBody) as { id: string; type: string; data?: { object?: { client_reference_id?: string; payment_status?: string } } };
  const inserted = await env.DB.prepare("INSERT OR IGNORE INTO stripe_events (id, event_type) VALUES (?, ?)").bind(event.id, event.type).run();
  if (!inserted.meta.changes) return json({ received: true, duplicate: true });
  try {
    if (event.type === "checkout.session.completed" && event.data?.object?.payment_status === "paid" && event.data.object.client_reference_id) {
      await env.DB.prepare("UPDATE users SET paid_at = datetime('now') WHERE id = ?").bind(event.data.object.client_reference_id).run();
    }
  } catch {
    await env.DB.prepare("DELETE FROM stripe_events WHERE id = ?").bind(event.id).run();
    return json({ error: "Webhook processing failed." }, 500);
  }
  return json({ received: true });
}
