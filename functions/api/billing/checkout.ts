import { json, requireUser, type AppContext } from "../_utils";

export async function onRequestPost({ request, env }: AppContext): Promise<Response> {
  const user = await requireUser(request, env);
  if (!user) return json({ error: "Authentication required." }, 401);
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) return json({ error: "Billing is not configured." }, 503);
  const origin = new URL(env.APP_ORIGIN);
  const form = new URLSearchParams({
    mode: "payment", "line_items[0][price]": env.STRIPE_PRICE_ID, "line_items[0][quantity]": "1",
    success_url: `${origin.origin}/?payment=success`, cancel_url: `${origin.origin}/?payment=cancelled`, client_reference_id: user.id, customer_email: user.email,
  });
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", { method: "POST", headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form });
  if (!response.ok) return json({ error: "Unable to create checkout session." }, 502);
  const session = await response.json<{ url?: string }>();
  return json({ url: session.url });
}
