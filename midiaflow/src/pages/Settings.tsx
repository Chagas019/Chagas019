import { Copy, Database, Download, KeyRound, LogOut, Mail, MessageCircle, RefreshCw, RotateCcw, ShieldCheck, Upload, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge, Button, Card, ConfirmDialog, Field, Input, PageHeader, SectionTitle } from '@/components/ui';
import { ACCESS_LABEL, useStore } from '@/lib/store';
import { downloadBlob } from '@/lib/csv';
import { getInviteCode, regenerateInviteCode } from '@/lib/remote';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { AppData, Period } from '@/lib/types';
import { cn, PERIOD_LABEL, WEEKDAYS } from '@/lib/utils';

export default function Settings() {
  const store = useStore();
  const { parish, me, can } = store;
  const [p, setP] = useState(parish);
  const [reset, setReset] = useState(false);
  const [av, setAv] = useState(me.availability);
  useEffect(() => setAv(me.availability), [me]);
  useEffect(() => {
    if (location.hash === '#disponibilidade') document.getElementById('disponibilidade')?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="space-y-5">
      <PageHeader title="Configurações" subtitle={`Você está como ${ACCESS_LABEL[me.access].toLowerCase()}`} />

      <Card id="disponibilidade">
        <SectionTitle title="Minha disponibilidade" subtitle="A coordenação usa isso para montar as escalas" />
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((d, i) => (
            <button key={d} aria-pressed={av.weekdays.includes(i)} onClick={() => setAv({ ...av, weekdays: toggle(av.weekdays, i) })}
              className={cn('h-10 w-12 rounded-xl border text-sm', av.weekdays.includes(i) ? 'border-neon/50 bg-neon/10 text-neon' : 'border-line text-ink-muted')}>{d}</button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(Object.keys(PERIOD_LABEL) as Period[]).map((x) => (
            <button key={x} aria-pressed={av.periods.includes(x)} onClick={() => setAv({ ...av, periods: toggle(av.periods, x) })}
              className={cn('h-9 rounded-full border px-4 text-sm', av.periods.includes(x) ? 'border-electric/50 bg-electric/10 text-electric' : 'border-line text-ink-muted')}>{PERIOD_LABEL[x]}</button>
          ))}
        </div>
        <Button className="mt-4" variant="primary" size="sm" onClick={() => { store.saveMember({ ...me, availability: av }); toast.success('Disponibilidade atualizada.'); }}>Salvar disponibilidade</Button>
      </Card>

      {store.mode === 'remote' && <AccountCard />}
      {store.mode === 'remote' && can('manage:team') && <InviteCard isAdmin={can('manage:users')} />}

      <Card>
        <SectionTitle title="Paróquia" subtitle={can('manage:parish') ? 'Identificação exibida na plataforma' : 'Apenas administradores podem alterar'} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Nome da paróquia"><Input disabled={!can('manage:parish')} placeholder="Ex.: Paróquia São José" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
          <Field label="Cidade"><Input disabled={!can('manage:parish')} placeholder="Ex.: Belo Horizonte – MG" value={p.city} onChange={(e) => setP({ ...p, city: e.target.value })} /></Field>
          <Field label="Nome da PASCOM"><Input disabled={!can('manage:parish')} placeholder="PASCOM" value={p.pascomName} onChange={(e) => setP({ ...p, pascomName: e.target.value })} /></Field>
        </div>
        {can('manage:parish') && (
          <Button className="mt-4" variant="primary" size="sm" onClick={() => {
            if (p.name.trim().length < 3) return toast.error('Informe o nome da paróquia.');
            store.updateParish({ name: p.name.trim(), city: p.city.trim(), pascomName: p.pascomName.trim() });
            toast.success('Dados da paróquia salvos.');
          }}>Salvar</Button>
        )}
      </Card>

      <Card>
        <SectionTitle title="Níveis de acesso" />
        <ul className="grid gap-3 sm:grid-cols-3">
          {[
            ['Administrador', 'Gerencia as configurações da paróquia e os usuários.'],
            ['Coordenador', 'Administra a equipe, as escalas e os eventos autorizados.'],
            ['Integrante', 'Consulta suas escalas, informa disponibilidade e confirma presença.'],
          ].map(([t, d]) => (
            <li key={t} className="rounded-2xl border border-line bg-surface/50 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-neon" />{t}</p>
              <p className="mt-1 text-sm text-ink-muted">{d}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <SectionTitle title="Integrações" subtitle="Status real das conexões externas" />
        <ul className="space-y-2.5">
          <Integration icon={Database} name="Supabase (banco e login)" ok={isSupabaseConfigured} okText="Configurado" offText="Não conectado · dados só neste aparelho" />
          <Integration icon={Mail} name="Notificações por e-mail" ok={false} offText="Não configurado" />
          <Integration icon={MessageCircle} name="Notificações por WhatsApp" ok={false} offText="Não configurado" />
        </ul>
        <p className="mt-3 text-xs text-ink-muted">O README explica como conectar cada serviço. Nenhuma mensagem é enviada enquanto a integração não estiver configurada.</p>
      </Card>

      {store.mode === 'demo' && (
        <Card>
          <SectionTitle title="Dados deste aparelho" subtitle="Sem conta online, tudo fica salvo só neste navegador. Faça cópias de segurança com frequência." />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" icon={Download} onClick={() => {
              const { example: _e, ...rest } = store;
              void _e;
              const payload = JSON.stringify({ app: 'midiaflow', version: 1, savedAt: new Date().toISOString(), data: pickData(rest) }, null, 2);
              downloadBlob(`midiaflow-copia-${new Date().toISOString().slice(0, 10)}.json`, new Blob([payload], { type: 'application/json' }));
              toast.success('Cópia de segurança baixada.');
            }}>Baixar cópia de segurança</Button>
            <label className="glass inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-white/[0.08] px-3.5 text-[13px] hover:bg-white/[0.06]">
              <Upload className="h-4 w-4" />Restaurar cópia
              <input type="file" accept="application/json,.json" className="sr-only" onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                try {
                  const parsed = JSON.parse(await f.text());
                  const d = parsed?.data;
                  if (parsed?.app !== 'midiaflow' || !Array.isArray(d?.schedules) || !Array.isArray(d?.members) || !d?.currentUserId) throw new Error('arquivo');
                  store.importData(d);
                  toast.success('Cópia restaurada.');
                } catch {
                  toast.error('Arquivo inválido. Use uma cópia baixada pelo MídiaFlow.');
                }
              }} />
            </label>
            <Button variant="danger" size="sm" icon={RotateCcw} onClick={() => setReset(true)}>Apagar tudo e recomeçar</Button>
          </div>
        </Card>
      )}
      <ConfirmDialog open={reset} onOpenChange={setReset} title="Apagar tudo?" body="Escalas, eventos, equipe e configurações deste aparelho serão apagados. Baixe uma cópia antes, se quiser guardar." confirmLabel="Apagar tudo"
        onConfirm={() => store.resetDemo()} />
    </div>
  );
}

function Integration({ icon: Icon, name, ok, okText = 'Conectado', offText }: { icon: typeof Mail; name: string; ok: boolean; okText?: string; offText: string }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface/40 px-4 py-3">
      <span className="flex items-center gap-3 text-sm"><Icon className="h-4 w-4 text-ink-muted" />{name}</span>
      <Badge tone={ok ? 'neon' : 'muted'} dot>{ok ? okText : offText}</Badge>
    </li>
  );
}

function AccountCard() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    supabase?.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''));
  }, []);
  return (
    <Card>
      <SectionTitle title="Minha conta" subtitle="Acesso com e-mail e senha" />
      <p className="flex items-center gap-2 text-sm"><UserRound className="h-4 w-4 text-ink-muted" />{email || '…'}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input type="password" autoComplete="new-password" placeholder="Nova senha (mín. 8, letras e números)" value={pw} onChange={(e) => setPw(e.target.value)} className="sm:max-w-xs" />
        <Button icon={KeyRound} loading={saving} onClick={async () => {
          if (pw.length < 8 || !/\d/.test(pw) || !/[a-z]/i.test(pw)) return toast.error('A senha precisa ter pelo menos 8 caracteres, com letras e números.');
          setSaving(true);
          const { error } = (await supabase?.auth.updateUser({ password: pw })) ?? { error: null };
          setSaving(false);
          if (error) toast.error('Não foi possível alterar a senha. Entre novamente e tente de novo.');
          else { setPw(''); toast.success('Senha alterada.'); }
        }}>Alterar senha</Button>
        <Button variant="danger" icon={LogOut} onClick={() => supabase?.auth.signOut()}>Sair</Button>
      </div>
    </Card>
  );
}

function InviteCard({ isAdmin }: { isAdmin: boolean }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    getInviteCode().then(setCode).catch((e) => toast.error((e as Error).message));
  }, []);
  const link = code ? `${location.origin}/?convite=${code}` : '';
  const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => toast.success('Copiado!')).catch(() => toast.error('Não foi possível copiar.'));
  return (
    <Card>
      <SectionTitle title="Convite da equipe" subtitle="Envie o link (ou o código) para quem vai servir na PASCOM" />
      <div className="flex flex-wrap items-center gap-3">
        <span className="glass rounded-2xl border border-white/10 px-4 py-2 font-mono text-xl tracking-[0.3em]">{code || '········'}</span>
        <Button size="sm" icon={Copy} disabled={!code} onClick={() => copy(code)}>Copiar código</Button>
        <Button size="sm" variant="primary" icon={Copy} disabled={!code} onClick={() => copy(`Você foi convidado(a) para a equipe da PASCOM no MídiaFlow. Crie sua conta por este link: ${link}`)}>Copiar convite</Button>
        {isAdmin && (
          <Button size="sm" variant="ghost" icon={RefreshCw} loading={busy} onClick={async () => {
            setBusy(true);
            try { setCode(await regenerateInviteCode()); toast.success('Novo código gerado. O anterior deixou de valer.'); }
            catch (e) { toast.error((e as Error).message); }
            finally { setBusy(false); }
          }}>Gerar novo código</Button>
        )}
      </div>
      <p className="mt-3 text-xs text-ink-muted">Quem entra pelo convite começa como integrante. O administrador define coordenadores na tela Equipe.</p>
    </Card>
  );
}

const pickData = (s: AppData): AppData => ({
  parish: s.parish, roles: s.roles, members: s.members, schedules: s.schedules, events: s.events,
  notifications: s.notifications, audit: s.audit, announcements: s.announcements, currentUserId: s.currentUserId,
});
