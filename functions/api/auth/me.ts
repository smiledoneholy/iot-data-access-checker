import { json, requireUser, type AppContext } from "../_utils";

export async function onRequestGet({ request, env }: AppContext): Promise<Response> {
  const user = await requireUser(request, env);
  return user ? json({ user }) : json({ user: null });
}
