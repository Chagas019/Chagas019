import { getI18n } from "@/i18n/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { m } = await getI18n();
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 sm:py-16 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:px-8">
      <aside className="bg-grain relative hidden overflow-hidden rounded-xl bg-navy-900 p-10 text-white lg:block" aria-hidden>
        <p className="text-xs font-semibold tracking-[0.2em] text-gold-500 uppercase">{m.home.eyebrow}</p>
        <p className="mt-6 font-display text-4xl leading-tight font-semibold whitespace-pre-line">{m.home.title}</p>
        <p className="mt-6 max-w-sm text-navy-200">{m.home.freeBody}</p>
        <div className="mt-12 flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="size-2.5 rounded-full bg-gold-500" style={{ opacity: 1 - i * 0.2 }} />
          ))}
        </div>
      </aside>
      <div className="w-full max-w-md justify-self-center lg:justify-self-start">{children}</div>
    </div>
  );
}
