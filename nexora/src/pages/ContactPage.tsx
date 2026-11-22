import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { LeadForm } from '@/components/property/LeadForm';
import { useContent } from '@/hooks/useData';
import { useSeo } from '@/hooks/useSeo';
import { whatsappLink } from '@/lib/whatsapp';

export default function ContactPage() {
  const { data } = useContent();
  const c = data?.contact;
  useSeo({ title: 'Contato | NEXORA Real Estate', description: 'Fale com um consultor da NEXORA.', path: '/contato' });
  return (
    <div className="theme-light min-h-screen bg-bg pb-section pt-[calc(var(--header-h)+2.5rem)] text-fg">
      <div className="container grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="eyebrow mb-3">Contato</p>
          <h1 className="text-display-lg font-medium">Fale com um consultor</h1>
          <p className="mt-4 max-w-md text-muted">Conte o que você procura — bairro, tamanho, prazo — e indicamos imóveis que combinam com você.</p>
          <ul className="mt-10 space-y-4 text-[15px]">
            {c?.email && <li className="flex gap-3"><Mail size={18} className="mt-0.5 text-signal" /><a href={`mailto:${c.email}`} className="hover:underline">{c.email}</a></li>}
            {c?.phone && <li className="flex gap-3"><Phone size={18} className="mt-0.5 text-signal" /><a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`} className="hover:underline">{c.phone}</a></li>}
            {c?.address && <li className="flex gap-3"><MapPin size={18} className="mt-0.5 text-signal" />{c.address}</li>}
            {c?.hours && <li className="flex gap-3"><Clock size={18} className="mt-0.5 text-signal" />{c.hours}</li>}
            <li><a href={whatsappLink(c?.whatsapp ?? '', 'Olá! Gostaria de falar com um consultor da NEXORA.')} target="_blank" rel="noopener noreferrer" className="btn-ghost"><MessageCircle size={16} /> Conversar no WhatsApp</a></li>
          </ul>
          {!c?.email && !c?.phone && <p className="mt-6 text-xs text-muted">Telefone e e-mail da imobiliária ainda não foram configurados nesta versão de demonstração. O formulário funciona e as mensagens aparecem no painel.</p>}
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <div className="surface p-6 md:p-8"><LeadForm kind="contato" source="pagina-contato" /></div>
        </div>
      </div>
    </div>
  );
}
