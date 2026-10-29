import { differenceInCalendarDays, parseISO } from 'date-fns';
import { CalendarPlus, Clock, Download, Link2Off, MapPin, MessageCircle, Share, Trash2, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/layout/Logo';
import { Badge, Button, buttonClass, ConfirmDialog } from '@/components/ui';
import { downloadBlob } from '@/lib/csv';
import { decodeSnapshot, SERVO_KEY, toICS, type ServoItem, type ServoSnapshot } from '@/lib/servo';
import { isSupabaseConfigured } from '@/lib/supabase';
import { capitalize, fmt, toISODate } from '@/lib/utils';

type State = { s: 'loading' } | { s: 'empty' } | { s: 'invalid' } | { s: 'ok'; snap: ServoSnapshot };

function readSaved(): ServoSnapshot | null {
  try {
    const raw = localStorage.getItem(SERVO_KEY);
    return raw ? (JSON.parse(raw) as ServoSnapshot) : null;
  } catch {
    return null;
  }
}

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
}

/** Botão de instalar: Android/Chrome usam o aviso do navegador; no iPhone mostramos o caminho. */
function useInstall() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const standalone = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  useEffect(() => {
    const on = (e: Event) => { e.preventDefault(); setPrompt(e as InstallPrompt); };
    window.addEventListener('beforeinstallprompt', on);
    return () => window.removeEventListener('beforeinstallprompt', on);
  }, []);
  return { prompt, standalone, ios, clear: () => setPrompt(null) };
}

export default function Servo() {
  const [state, setState] = useState<State>({ s: 'loading' });
  const [wipe, setWipe] = useState(false);
  const install = useInstall();

  useEffect(() => {
    document.title = 'Minhas escalas · MídiaFlow';
    const load = async () => {
      const code = new URLSearchParams(location.hash.slice(1)).get('d');
      if (code) {
        const snap = await decodeSnapshot(code);
        if (!snap) return setState({ s: 'invalid' });
        const saved = readSaved();
        // Um link antigo não substitui escalas mais novas já guardadas.
        const keep = saved && saved.at > snap.at && saved.n === snap.n ? saved : snap;
        try { localStorage.setItem(SERVO_KEY, JSON.stringify(keep)); } catch { /* modo privado */ }
        return setState({ s: 'ok', snap: keep });
      }
      const saved = readSaved();
      setState(saved ? { s: 'ok', snap: saved } : { s: 'empty' });
    };
    void load();
    // Link novo aberto com a tela já aberta (só muda o que vem depois do #).
    const onHash = () => void load();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <div className="ambient min-h-dvh">
      <div className="relative z-10 mx-auto max-w-lg px-4 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between gap-3">
          <Logo />
          {!install.standalone && state.s === 'ok' && (
            install.prompt ? (
              <Button size="sm" variant="outline" icon={Download} onClick={async () => { await install.prompt?.prompt(); install.clear(); }}>Instalar app</Button>
            ) : null
          )}
        </header>
        {state.s === 'loading' && <div className="skeleton mt-8 h-48 rounded-3xl" aria-busy="true" />}
        {state.s === 'invalid' && (
          <Message icon={Link2Off} title="Link incompleto" body="Esse link de escalas não abriu. Ele pode ter sido cortado ao copiar. Peça à coordenação para enviar de novo." />
        )}
        {state.s === 'empty' && (
          <Message icon={CalendarPlus} title="Suas escalas aparecem aqui"
            body={isSupabaseConfigured ? 'Entre com a sua conta para ver e confirmar suas escalas.' : 'Peça à coordenação da PASCOM o link das suas escalas. Ao abrir o link, elas ficam guardadas neste celular.'}
            action={isSupabaseConfigured ? <Link to="/minhas-escalas" className={buttonClass('primary')}>Entrar</Link> : undefined} />
        )}
        {state.s === 'ok' && <Agenda snap={state.snap} install={install} onWipe={() => setWipe(true)} />}
      </div>
      <ConfirmDialog open={wipe} onOpenChange={setWipe} title="Apagar do celular?" body="As escalas guardadas neste aparelho serão apagadas. Você pode abrir o link da coordenação de novo quando quiser."
        confirmLabel="Apagar" onConfirm={() => { try { localStorage.removeItem(SERVO_KEY); } catch { /* */ } history.replaceState(null, '', '/servo'); setState({ s: 'empty' }); }} />
    </div>
  );
}

function Message({ icon: Icon, title, body, action }: { icon: typeof Clock; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="card mt-8 flex flex-col items-center p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neon/10 text-neon"><Icon className="h-6 w-6" /></span>
      <h1 className="mt-4 text-xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-ink-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const whenLabel = (d: string) => {
  const diff = differenceInCalendarDays(parseISO(d), new Date());
  return diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : `Em ${diff} dias`;
};

const waLink = (x: ServoItem, who: string, text: string) =>
  `https://wa.me/${x.kp ?? ''}?text=${encodeURIComponent(`${text}\n\n${x.t} · ${capitalize(fmt(x.d, "EEEE, dd/MM"))} às ${x.st}\nFunção: ${x.r}\n— ${who}`)}`;

function Agenda({ snap, install, onWipe }: { snap: ServoSnapshot; install: ReturnType<typeof useInstall>; onWipe: () => void }) {
  const today = toISODate(new Date());
  const items = useMemo(() => snap.s.filter((x) => x.d >= today), [snap, today]);
  const [next, ...rest] = items;
  const first = snap.n.split(' ')[0] || 'servo';

  return (
    <main className="mt-6 space-y-4">
      <div>
        <p className="text-sm text-ink-muted">{snap.p}{snap.pc ? ` · ${snap.pc}` : ''}</p>
        <h1 className="mt-1 text-[26px] font-bold tracking-tight">Olá, <span className="text-gradient">{first}</span>!</h1>
        <p className="text-sm text-ink-muted">{items.length ? `Você tem ${items.length} ${items.length === 1 ? 'escala' : 'escalas'} pela frente.` : 'Nenhuma escala pela frente.'}</p>
      </div>

      {next ? (
        <article className="card overflow-hidden p-5" aria-label="Próxima escala">
          <div className="flex items-center justify-between gap-2">
            <Badge tone="neon" dot>{whenLabel(next.d)}</Badge>
            <span className="text-xs text-ink-muted">Próxima missão</span>
          </div>
          <h2 className="mt-3 text-xl font-semibold">{next.t}</h2>
          <p className="mt-1 text-[15px] text-neon">{next.r}</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-ink-muted" />{capitalize(fmt(next.d, "EEEE, d 'de' MMMM"))} · {next.st}{next.en ? `–${next.en}` : ''}</li>
            {next.l && <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-ink-muted" />{next.l}</li>}
            {next.c.length > 0 && <li className="flex items-start gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" /><span>{next.c.join(' · ')}</span></li>}
          </ul>
          {next.o && <p className="mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 text-sm text-ink-muted">{next.o}</p>}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <a href={waLink(next, snap.n, 'Confirmo minha presença na escala. 🙏')} target="_blank" rel="noopener noreferrer" className={buttonClass('primary', 'md', 'w-full')}>
              <MessageCircle className="h-4 w-4" />Confirmar
            </a>
            <a href={waLink(next, snap.n, 'Não vou conseguir servir nesta escala. Podemos ver uma substituição?')} target="_blank" rel="noopener noreferrer" className={buttonClass('secondary', 'md', 'w-full')}>
              Não poderei
            </a>
          </div>
          <p className="mt-2 text-center text-xs text-ink-muted">{next.kp && next.kn ? `Abre o WhatsApp de ${next.kn} com a mensagem pronta.` : 'Abre o WhatsApp com a mensagem pronta. Escolha a coordenação da PASCOM.'}</p>
        </article>
      ) : (
        <div className="card p-6 text-center text-sm text-ink-muted">Quando a coordenação escalar você, envie o link novo para atualizar.</div>
      )}

      {rest.length > 0 && (
        <section className="card p-4">
          <h2 className="px-1 text-sm font-semibold">Depois</h2>
          <ul className="mt-2 divide-y divide-white/[0.06]">
            {rest.map((x, i) => (
              <li key={i} className="flex items-center gap-3 px-1 py-3">
                <div className="w-12 shrink-0 text-center">
                  <p className="text-[11px] uppercase text-ink-muted">{fmt(x.d, 'EEE')}</p>
                  <p className="text-lg font-semibold leading-tight">{fmt(x.d, 'dd')}</p>
                  <p className="text-[11px] text-ink-muted">{fmt(x.d, 'MMM')}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px]">{x.t}</p>
                  <p className="truncate text-[13px] text-ink-muted">{x.r} · {x.st}{x.l ? ` · ${x.l}` : ''}</p>
                </div>
                <a href={waLink(x, snap.n, 'Confirmo minha presença na escala. 🙏')} target="_blank" rel="noopener noreferrer" aria-label={`Confirmar ${x.t} pelo WhatsApp`}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-ink-muted hover:border-neon hover:text-neon">
                  <MessageCircle className="h-4 w-4" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {snap.tk && snap.tk.length > 0 && (
        <section className="card p-4" aria-label="Minhas tarefas">
          <h2 className="px-1 text-sm font-semibold">Minhas tarefas</h2>
          <ul className="mt-2 divide-y divide-white/[0.06]">
            {snap.tk.map((k, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-1 py-2.5 text-sm">
                <span className="min-w-0"><span className="block truncate">{k.t}</span><span className="text-xs text-ink-muted">{k.col}</span></span>
                {k.due && <Badge tone={k.due < today ? 'danger' : 'muted'}>{k.due < today ? 'Atrasada' : fmt(k.due, 'dd/MM')}</Badge>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {items.length > 0 && (
        <Button className="w-full" icon={CalendarPlus} onClick={() => downloadBlob('minhas-escalas.ics', new Blob([toICS({ ...snap, s: items })], { type: 'text/calendar;charset=utf-8' }))}>
          Colocar na agenda do celular
        </Button>
      )}

      {!install.standalone && !install.prompt && (
        <div className="card p-4 text-sm">
          <p className="font-semibold">Instale no seu celular</p>
          {install.ios ? (
            <p className="mt-1 text-ink-muted">No Safari, toque em <Share className="inline h-4 w-4 align-text-bottom" /> <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>.</p>
          ) : (
            <p className="mt-1 text-ink-muted">No Chrome, toque no menu <b>⋮</b> e depois em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>.</p>
          )}
          <p className="mt-1 text-ink-muted">O ícone do MídiaFlow abre direto nas suas escalas, até sem internet.</p>
        </div>
      )}

      <footer className="flex items-center justify-between gap-3 px-1 pt-2 text-xs text-ink-muted">
        <span>Atualizado em {fmt(snap.at.slice(0, 10), 'dd/MM')} às {new Date(snap.at).toTimeString().slice(0, 5)}. Mudou a escala? A coordenação envia um link novo.</span>
        <button onClick={onWipe} aria-label="Apagar escalas deste celular" className="shrink-0 rounded-full p-2 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
      </footer>
    </main>
  );
}
