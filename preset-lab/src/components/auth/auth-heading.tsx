/** Cabeçalho das telas de autenticação. */
export function AuthHeading({ kicker, title, children }: { kicker: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-8">
      <p className="lab-label text-signal">{kicker}</p>
      <h1 className="display mt-4 text-[clamp(2.75rem,7vw,4.75rem)]">{title}</h1>
      {children && <div className="mt-4 text-[16px] leading-relaxed text-ash">{children}</div>}
    </div>
  );
}
