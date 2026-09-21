import { Checker } from "@/components/checker";

export default function Home() {
  return (
    <main>
      <header className="border-b border-slate-800"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5"><span className="font-semibold"><span className="text-cyan-400">IoT</span> Data Access Checker</span><span className="rounded-full border border-emerald-700 bg-emerald-950 px-3 py-1 text-xs text-emerald-300">Local-first MVP</span></div></header>
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-10 max-w-3xl"><p className="mb-3 text-sm font-semibold uppercase tracking-[.2em] text-cyan-400">OpenAPI technical readiness</p><h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Find data-access gaps before your customers do.</h1><p className="mt-5 text-lg leading-8 text-slate-400">Analyze connected-product API documentation against practical data-access signals. Get actionable findings—not a legal certification.</p></div>
        <Checker />
      </div>
    </main>
  );
}
