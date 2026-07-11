export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(94,234,212,0.18),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.18),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#050816_100%)] text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-6 py-16 sm:px-8 lg:px-12">
        <div className="max-w-3xl">
          <p className="mb-5 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-medium uppercase tracking-[0.32em] text-cyan-200/90 backdrop-blur">
            zoxilsi studio
          </p>
          <h1 className="max-w-2xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Mesh gradient design, tuned for production.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Create, animate, and export rich gradient compositions in the browser. The project is deployed at
            <span className="mx-1 font-medium text-cyan-200">studio.zoxilsi.cc</span>
            and optimized for fast static hosting.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href="https://studio.zoxilsi.cc"
              className="inline-flex items-center rounded-full bg-cyan-300 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
            >
              Open studio
            </a>
            <a
              href="https://github.com/zoxilsi/studio"
              className="inline-flex items-center rounded-full border border-white/12 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              View source
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}