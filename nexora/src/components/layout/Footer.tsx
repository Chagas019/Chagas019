import { Globe, Mail, Phone, MapPin, Clock } from 'lucide-react';
import { TLink } from '@/components/ui/TLink';
import { useContent } from '@/hooks/useData';
import { useMotionPref } from '@/hooks/useMotionPref';
import { isSupabaseConfigured } from '@/lib/supabase';
import { openCookiePreferences } from './CookieConsent';
import { LogoMark } from './Logo';

export function Footer() {
  const { data } = useContent();
  const c = data?.contact;
  const { userReduced, setUserReduced } = useMotionPref();
  const social = c ? [
    { href: c.instagram, label: 'Instagram' },
    { href: c.linkedin, label: 'LinkedIn' },
    { href: c.youtube, label: 'YouTube' },
  ].filter((s) => s.href) : [];
  const legal = c ? [c.legalName, c.cnpj && `CNPJ ${c.cnpj}`, c.creci && `CRECI ${c.creci}`].filter(Boolean).join(' · ') : '';

  return (
    <footer className="relative overflow-hidden border-t border-white/[0.07] bg-ink text-paper">
      <div className="container py-16 md:py-20">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-4">
            <LogoMark size={40} />
            <p className="mt-6 max-w-xs text-display-sm font-medium">Arquitetura para morar, explorada antes da visita.</p>
          </div>
          <nav aria-label="Institucional" className="md:col-span-2">
            <h2 className="eyebrow mb-4">Navegue</h2>
            <ul className="space-y-2.5 text-sm text-paper/75">
              <li><TLink className="hover:text-paper" to="/imoveis">Todos os imóveis</TLink></li>
              <li><TLink className="hover:text-paper" to="/imoveis?finalidade=venda">Comprar</TLink></li>
              <li><TLink className="hover:text-paper" to="/imoveis?finalidade=aluguel">Alugar</TLink></li>
              <li><TLink className="hover:text-paper" to="/experiencia-3d">Experiência 3D</TLink></li>
              <li><TLink className="hover:text-paper" to="/sobre">Como funciona</TLink></li>
              <li><TLink className="hover:text-paper" to="/favoritos">Favoritos</TLink></li>
            </ul>
          </nav>
          <div className="md:col-span-3">
            <h2 className="eyebrow mb-4">Contato</h2>
            <ul className="space-y-3 text-sm text-paper/75">
              {c?.email && <li className="flex gap-2.5"><Mail size={16} className="mt-0.5 shrink-0 text-mist" /><a className="hover:text-paper" href={`mailto:${c.email}`}>{c.email}</a></li>}
              {c?.phone && <li className="flex gap-2.5"><Phone size={16} className="mt-0.5 shrink-0 text-mist" /><a className="hover:text-paper" href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}>{c.phone}</a></li>}
              {c?.address && <li className="flex gap-2.5"><MapPin size={16} className="mt-0.5 shrink-0 text-mist" />{c.address}</li>}
              {c?.hours && <li className="flex gap-2.5"><Clock size={16} className="mt-0.5 shrink-0 text-mist" />{c.hours}</li>}
              <li><TLink to="/contato" className="text-signal-soft hover:underline">Fale com um consultor</TLink></li>
            </ul>
            {social.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2" aria-label="Redes sociais">
                {social.map(({ href, label }) => (
                  <li key={label}><a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[40px] items-center gap-2 rounded border border-white/10 px-3 text-[13px] text-paper/80 hover:text-paper"><Globe size={14} />{label}</a></li>
                ))}
              </ul>
            )}
          </div>
          <div className="md:col-span-3">
            <h2 className="eyebrow mb-4">Privacidade e acessibilidade</h2>
            <ul className="space-y-2.5 text-sm text-paper/75">
              <li><TLink className="hover:text-paper" to="/privacidade">Política de privacidade</TLink></li>
              <li><TLink className="hover:text-paper" to="/termos">Termos de uso</TLink></li>
              <li><button type="button" className="hover:text-paper" onClick={openCookiePreferences}>Preferências de armazenamento</button></li>
              <li>
                <label className="flex cursor-pointer items-center gap-2.5">
                  <input type="checkbox" className="h-4 w-4 accent-signal" checked={userReduced} onChange={(e) => setUserReduced(e.target.checked)} />
                  Reduzir animações e efeitos
                </label>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-16 flex flex-col gap-3 border-t border-white/[0.07] pt-6 text-xs text-mist md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} {c?.companyName ?? 'NEXORA Real Estate'}{legal ? ` · ${legal}` : ''}</p>
          <p>
            {legal ? 'Imagens e plantas podem ser ilustrativas; confirme as informações com um consultor.' : 'Versão de demonstração: os imóveis são fictícios e os dados legais da imobiliária ainda não foram configurados.'}
            {!isSupabaseConfigured && ' Modo demonstração (dados locais).'}
          </p>
        </div>
      </div>
      <p aria-hidden className="pointer-events-none select-none whitespace-nowrap px-4 text-center font-semibold leading-none tracking-[-0.06em] text-white/[0.035]" style={{ fontSize: 'clamp(4rem, 19vw, 18rem)', marginBottom: '-0.18em' }}>NEXORA</p>
    </footer>
  );
}
