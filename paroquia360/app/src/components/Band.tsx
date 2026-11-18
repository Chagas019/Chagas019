import Link from 'next/link';
import { Icon } from './Icon';

export function Band({ title, sub, parish, action }: { title: string; sub?: string; parish: { name: string; slug: string }; action?: React.ReactNode }) {
  return (
    <section className="band" aria-labelledby="pageTitle">
      <div className="top">
        <Link className="pill" href={`/p/${parish.slug}`} aria-label={`Início de ${parish.name}`}><Icon name="arrowl" /><span>{parish.name}</span></Link>
        {action}
      </div>
      <h1 className="band-title" id="pageTitle">{title}</h1>
      {sub && <p className="band-sub">{sub}</p>}
    </section>
  );
}

export function Flash({ ok, erro }: { ok?: string; erro?: string }) {
  if (erro) return <div className="notice err" role="alert">{erro}</div>;
  if (ok) return <div className="notice ok" role="status">{ok}</div>;
  return null;
}
