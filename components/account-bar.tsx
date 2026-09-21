"use client";

import { useEffect, useState } from "react";
import { LogIn, LogOut, UserPlus, X } from "lucide-react";

export interface SessionUser { id: string; email: string }

interface AccountBarProps {
  user: SessionUser | null;
  onUserChange: (user: SessionUser | null) => void;
}

export function AccountBar({ user, onUserChange }: AccountBarProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then(async (response): Promise<{ user: SessionUser | null }> => response.ok ? await response.json() as { user: SessionUser | null } : { user: null })
      .then((data) => onUserChange(data.user))
      .catch(() => onUserChange(null));
  }, [onUserChange]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
      });
      const data = await response.json() as { user?: SessionUser; error?: string };
      if (!response.ok || !data.user) throw new Error(data.error ?? "Authentication failed.");
      onUserChange(data.user); setOpen(false); setPassword("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Authentication failed."); }
    finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => undefined);
    onUserChange(null); setBusy(false);
  }

  if (user) return <div className="flex items-center gap-3"><span className="hidden max-w-56 truncate text-sm text-slate-300 sm:block">{user.email}</span><button disabled={busy} onClick={logout} className="flex items-center gap-2 rounded-xl border border-slate-600 px-3 py-2 text-sm hover:bg-slate-800"><LogOut size={16} /> Sign out</button></div>;

  return <>
    <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-xl border border-cyan-500/60 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-950"><LogIn size={16} /> Sign in</button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between"><div><h2 id="auth-title" className="text-2xl font-semibold">{mode === "login" ? "Welcome back" : "Create your account"}</h2><p className="mt-1 text-sm text-slate-400">Save reports privately and access them later.</p></div><button aria-label="Close" onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-slate-800"><X size={20} /></button></div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block text-sm">Email<input required type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400" /></label>
          <label className="block text-sm">Password<input required type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={mode === "register" ? 12 : 1} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-400" />{mode === "register" && <span className="mt-1 block text-xs text-slate-500">Use at least 12 characters.</span>}</label>
          {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-60">{mode === "login" ? <LogIn size={18} /> : <UserPlus size={18} />}{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
        </form>
        <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} className="mt-4 w-full text-sm text-cyan-300 hover:text-cyan-200">{mode === "login" ? "New here? Create an account" : "Already have an account? Sign in"}</button>
      </div>
    </div>}
  </>;
}
