import { useId, useState, type FormEvent } from 'react';
import { CalendarCheck, CheckCircle2, Send } from 'lucide-react';
import { TLink } from '@/components/ui/TLink';
import { createLead } from '@/services/leads';
import { fieldErrors, leadSchema, VISIT_TIMES, type LeadInput } from '@/lib/validation';
import { useToast } from '@/hooks/useToast';

interface Props { kind: 'informacoes' | 'visita' | 'contato'; propertyId?: string; propertyName?: string; source: string; compact?: boolean; onDone?: () => void }

const isoDay = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Formulário de contato/visita com validação, feedback e consentimento (LGPD) */
export function LeadForm({ kind, propertyId, propertyName, source, onDone }: Props) {
  const id = useId();
  const toast = useToast();
  const [v, setV] = useState<LeadInput>({ kind, name: '', email: '', phone: '', message: propertyName && kind === 'informacoes' ? `Olá! Gostaria de mais informações sobre ${propertyName}.` : '', visitMode: 'presencial', consent: false as unknown as true, website: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const set = (k: keyof LeadInput, val: unknown) => { setV((s) => ({ ...s, [k]: val })); setErrors((e) => ({ ...e, [k]: '' })); };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = leadSchema.safeParse(v);
    if (!r.success) {
      const errs = fieldErrors(r.error);
      setErrors(errs);
      document.getElementById(`${id}-${Object.keys(errs)[0]}`)?.focus();
      return;
    }
    if (r.data.website) { setState('done'); return; } // robô: finge sucesso, não grava
    setState('sending');
    try {
      await createLead({
        kind, name: r.data.name, email: r.data.email, phone: r.data.phone || undefined, message: r.data.message || undefined,
        propertyId, propertyName, source, consent: true,
        visitAt: kind === 'visita' ? new Date(`${r.data.visitDate}T${r.data.visitTime}:00`).toISOString() : undefined,
        visitMode: kind === 'visita' ? r.data.visitMode : undefined,
      });
      setState('done');
      toast.show(kind === 'visita' ? 'Pedido de visita enviado' : 'Mensagem enviada', { tone: 'success', description: 'Um consultor vai responder pelo e-mail ou telefone informados.' });
      onDone?.();
    } catch (err) {
      setState('idle');
      toast.show('Não foi possível enviar', { tone: 'error', description: (err as Error).message });
    }
  };

  if (state === 'done') {
    return (
      <div className="flex flex-col items-center px-2 py-8 text-center" role="status">
        <CheckCircle2 className="text-success" size={30} />
        <p className="mt-4 text-lg font-medium">{kind === 'visita' ? 'Pedido de visita recebido' : 'Recebemos sua mensagem'}</p>
        <p className="mt-2 max-w-xs text-sm text-muted">{kind === 'visita' ? `Vamos confirmar o horário de ${new Date(`${v.visitDate}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} às ${v.visitTime}.` : 'Um consultor entra em contato em breve.'}</p>
        <button type="button" className="btn-ghost mt-6" onClick={() => { setState('idle'); setV((s) => ({ ...s, message: '' })); }}>Enviar outra solicitação</button>
      </div>
    );
  }

  const err = (k: string) => errors[k] ? <p id={`${id}-${k}-e`} className="field-error">{errors[k]}</p> : null;
  const a = (k: string) => ({ id: `${id}-${k}`, 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `${id}-${k}-e` : undefined });

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="absolute -left-[9999px]" aria-hidden>
        <label htmlFor={`${id}-website`}>Não preencha este campo</label>
        <input id={`${id}-website`} tabIndex={-1} autoComplete="off" value={v.website} onChange={(e) => set('website', e.target.value)} />
      </div>
      <div>
        <label htmlFor={`${id}-name`} className="field-label">Nome</label>
        <input {...a('name')} className="field" autoComplete="name" value={v.name} onChange={(e) => set('name', e.target.value)} />
        {err('name')}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-email`} className="field-label">E-mail</label>
          <input {...a('email')} type="email" inputMode="email" className="field" autoComplete="email" value={v.email} onChange={(e) => set('email', e.target.value)} />
          {err('email')}
        </div>
        <div>
          <label htmlFor={`${id}-phone`} className="field-label">Telefone / WhatsApp <span className="text-muted/70">(opcional)</span></label>
          <input {...a('phone')} type="tel" inputMode="tel" className="field" autoComplete="tel" value={v.phone} onChange={(e) => set('phone', e.target.value)} />
          {err('phone')}
        </div>
      </div>
      {kind === 'visita' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${id}-visitDate`} className="field-label">Dia</label>
              <input {...a('visitDate')} type="date" className="field" min={isoDay(1)} max={isoDay(60)} value={v.visitDate ?? ''} onChange={(e) => set('visitDate', e.target.value)} />
              {err('visitDate')}
            </div>
            <div>
              <label htmlFor={`${id}-visitTime`} className="field-label">Horário</label>
              <select {...a('visitTime')} className="field" value={v.visitTime ?? ''} onChange={(e) => set('visitTime', e.target.value)}>
                <option value="">Escolha</option>
                {VISIT_TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              {err('visitTime')}
            </div>
          </div>
          <fieldset>
            <legend className="field-label">Formato</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['presencial', 'video'] as const).map((m) => (
                <label key={m} className={`flex min-h-[44px] cursor-pointer items-center justify-center rounded border text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-signal ${v.visitMode === m ? 'border-signal bg-signal/10 text-signal' : 'hairline hover:bg-fg/5'}`}>
                  <input type="radio" name={`${id}-mode`} className="sr-only" checked={v.visitMode === m} onChange={() => set('visitMode', m)} />
                  {m === 'presencial' ? 'Presencial' : 'Por vídeo'}
                </label>
              ))}
            </div>
            {err('visitMode')}
          </fieldset>
        </>
      )}
      <div>
        <label htmlFor={`${id}-message`} className="field-label">Mensagem <span className="text-muted/70">(opcional)</span></label>
        <textarea {...a('message')} rows={kind === 'visita' ? 2 : 4} className="field" value={v.message} onChange={(e) => set('message', e.target.value)} />
        {err('message')}
      </div>
      <div>
        <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed text-muted">
          <input {...a('consent')} type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-signal" checked={!!v.consent} onChange={(e) => set('consent', e.target.checked)} />
          <span>Concordo que a NEXORA use meus dados para responder a esta solicitação, conforme a <TLink to="/privacidade" className="text-signal underline-offset-2 hover:underline">política de privacidade</TLink>.</span>
        </label>
        {err('consent')}
      </div>
      <button type="submit" disabled={state === 'sending'} className="btn-primary w-full">
        {kind === 'visita' ? <CalendarCheck size={16} /> : <Send size={16} />}
        {state === 'sending' ? 'Enviando…' : kind === 'visita' ? 'Solicitar visita' : 'Enviar mensagem'}
      </button>
    </form>
  );
}
