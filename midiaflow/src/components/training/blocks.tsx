import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Award, Check, CheckCircle2, Circle, Info, Lightbulb, Printer, RotateCcw, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Segmented } from '@/components/ui';
import { MASS_MOMENTS, SPOTS, type Block, type ChurchSpot, type DeviceGuide, type QuizQuestion } from '@/lib/training';
import { cn } from '@/lib/utils';

function useLocal<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* sem armazenamento: vale até recarregar */
    }
  }, [key, v]);
  return [v, setV] as const;
}

export function BlockView({ b, userId, onQuizPassed }: { b: Block; userId: string; onQuizPassed?: (score: number) => void }) {
  switch (b.t) {
    case 'p':
      return <p className="leading-relaxed text-ink/90">{b.text}</p>;
    case 'list':
      return (
        <div>
          {b.title && <h3 className="mb-2 font-semibold">{b.title}</h3>}
          <ul className="space-y-2">
            {b.items.map((i) => (
              <li key={i} className="flex gap-2.5 leading-relaxed text-ink/90">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neon" />
                {i}
              </li>
            ))}
          </ul>
        </div>
      );
    case 'steps':
      return (
        <div>
          {b.title && <h3 className="mb-3 font-semibold">{b.title}</h3>}
          <ol className="space-y-3">
            {b.items.map((i, n) => (
              <li key={i} className="flex gap-3 leading-relaxed text-ink/90">
                <span className="glass flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-xs font-semibold text-neon">{n + 1}</span>
                <span className="pt-0.5">{i}</span>
              </li>
            ))}
          </ol>
        </div>
      );
    case 'table':
      return (
        <div>
          {b.title && <h3 className="mb-2 font-semibold">{b.title}</h3>}
          <div className="overflow-x-auto rounded-2xl border border-white/[0.07]">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-wider text-ink-muted">
                <tr>{b.head.map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody>
                {b.rows.map((r) => (
                  <tr key={r.join()} className="border-t border-white/[0.05]">
                    {r.map((c, i) => <td key={i} className={cn('px-4 py-3 align-top', i === 0 ? 'font-medium' : 'text-ink/85', 'whitespace-pre-wrap')}>{c}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    case 'callout': {
      const tone = { info: ['#55B8FF', Info], warn: ['#FFC857', AlertTriangle], ok: ['#5BFF9A', Lightbulb] } as const;
      const [color, Icon] = tone[b.tone];
      return (
        <div className="flex gap-3 rounded-2xl border p-4" style={{ borderColor: `${color}40`, background: `${color}0d` }}>
          <Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color }} />
          <div>
            <p className="font-semibold" style={{ color }}>{b.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink/90">{b.text}</p>
          </div>
        </div>
      );
    }
    case 'dodont':
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-neon/25 bg-neon/[0.04] p-4">
            <p className="mb-3 flex items-center gap-2 font-semibold text-neon"><ThumbsUp className="h-4 w-4" />Faça</p>
            <ul className="space-y-2 text-sm">{b.do.map((i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-neon" />{i}</li>)}</ul>
          </div>
          <div className="rounded-2xl border border-danger/25 bg-danger/[0.04] p-4">
            <p className="mb-3 flex items-center gap-2 font-semibold text-danger"><ThumbsDown className="h-4 w-4" />Evite</p>
            <ul className="space-y-2 text-sm">{b.dont.map((i) => <li key={i} className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-danger" />{i}</li>)}</ul>
          </div>
        </div>
      );
    case 'devices':
      return <Devices items={b.items} />;
    case 'checklist':
      return <Checklist id={`${userId}:${b.id}`} title={b.title} items={b.items} />;
    case 'map':
      return <ChurchMap />;
    case 'moments':
      return <Moments />;
    case 'quiz':
      return <Quiz questions={b.questions} onPassed={onQuizPassed} />;
  }
}

/* ---------- Aparelhos ---------- */
function Devices({ items }: { items: DeviceGuide[] }) {
  const [tab, setTab] = useState(items[0].id);
  const d = items.find((i) => i.id === tab)!;
  return (
    <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5">
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <Segmented value={tab} onChange={setTab} options={items.map((i) => ({ value: i.id, label: i.label }))} />
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={d.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          <p className="mt-4 text-sm text-ink-muted">{d.models}</p>
          <div className="mt-4 space-y-5">
            {d.sections.map((s) => (
              <div key={s.title}>
                <h4 className="mb-2 text-sm font-semibold text-electric">{s.title}</h4>
                <ul className="space-y-2">
                  {s.items.map((i) => (
                    <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-ink/90">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-electric" />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ---------- Checklist ---------- */
function Checklist({ id, title, items }: { id: string; title: string; items: string[] }) {
  const [done, setDone] = useLocal<number[]>(`midiaflow:check:${id}`, []);
  return (
    <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-xs text-ink-muted">{done.length}/{items.length}</span>
      </div>
      <ul className="space-y-1">
        {items.map((it, i) => {
          const on = done.includes(i);
          return (
            <li key={it}>
              <button onClick={() => setDone(on ? done.filter((x) => x !== i) : [...done, i])} aria-pressed={on}
                className={cn('flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors hover:bg-white/5', on && 'text-ink-muted line-through')}>
                {on ? <CheckCircle2 className="h-5 w-5 shrink-0 text-neon" /> : <Circle className="h-5 w-5 shrink-0 text-ink-muted" />}
                {it}
              </button>
            </li>
          );
        })}
      </ul>
      {done.length > 0 && (
        <button className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink" onClick={() => setDone([])}>
          <RotateCcw className="h-3.5 w-3.5" />Recomeçar
        </button>
      )}
    </div>
  );
}

/* ---------- Mapa da igreja ---------- */
const ACCESS = {
  livre: { label: 'Livre', color: '#5BFF9A' },
  discreto: { label: 'Com discrição', color: '#FFC857' },
  autorizado: { label: 'Só com autorização', color: '#FF6B7A' },
} as const;

function ChurchMap() {
  const [sel, setSel] = useState<ChurchSpot>(SPOTS[0]);
  const pews = [];
  for (let r = 0; r < 9; r++) {
    pews.push({ x: 96, y: 210 + r * 34 }, { x: 222, y: 210 + r * 34 });
  }
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-3">
        <svg viewBox="0 0 400 680" className="h-auto w-full" role="img" aria-label="Planta da igreja com as posições de fotografia">
          <defs>
            <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#FF6B7A" strokeOpacity="0.35" strokeWidth="2" />
            </pattern>
          </defs>
          {/* paredes */}
          <path d="M40 620 V150 Q40 40 200 30 Q360 40 360 150 V620 Z" fill="rgba(255,255,255,0.025)" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
          {/* presbitério */}
          <path d="M70 180 V150 Q70 66 200 58 Q330 66 330 150 V180 Z" fill="url(#hatch)" stroke="#FF6B7A" strokeOpacity="0.6" strokeDasharray="6 5" />
          <text x="200" y="172" textAnchor="middle" fontSize="10" fill="#FF6B7A" opacity="0.9" letterSpacing="2">PRESBITÉRIO</text>
          {/* altar, ambão, cadeira */}
          <rect x="165" y="100" width="70" height="26" rx="4" fill="#F5F7FA" fillOpacity="0.85" />
          <text x="200" y="117" textAnchor="middle" fontSize="10" fill="#07090D" fontWeight="600">ALTAR</text>
          <rect x="92" y="140" width="34" height="18" rx="3" fill="#55B8FF" fillOpacity="0.7" />
          <text x="109" y="153" textAnchor="middle" fontSize="8" fill="#07090D" fontWeight="600">AMBÃO</text>
          <circle cx="200" cy="76" r="8" fill="none" stroke="#F5F7FA" strokeOpacity="0.6" />
          <text x="216" y="79" fontSize="8" fill="#96A3B5">cadeira</text>
          {/* sacristia */}
          <rect x="300" y="64" width="56" height="44" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
          <text x="328" y="58" textAnchor="middle" fontSize="8" fill="#96A3B5">SACRISTIA</text>
          {/* bancos */}
          {pews.map((p, i) => <rect key={i} x={p.x} y={p.y} width="82" height="20" rx="3" fill="rgba(255,255,255,0.07)" />)}
          <text x="200" y="512" textAnchor="middle" fontSize="9" fill="#96A3B5" letterSpacing="2">NAVE</text>
          {/* coro */}
          <rect x="60" y="560" width="280" height="50" rx="6" fill="rgba(85,184,255,0.06)" stroke="rgba(85,184,255,0.3)" strokeDasharray="4 4" />
          <text x="200" y="604" textAnchor="middle" fontSize="8" fill="#55B8FF">CORO / MEZANINO (piso superior)</text>
          {/* porta */}
          <rect x="170" y="616" width="60" height="8" rx="2" fill="#07090D" stroke="rgba(255,255,255,0.4)" />
          <text x="200" y="642" textAnchor="middle" fontSize="8" fill="#96A3B5">PORTA PRINCIPAL</text>

          {/* posições */}
          {SPOTS.map((s) => {
            const active = sel.id === s.id;
            const c = ACCESS[s.access].color;
            return (
              <g key={s.id} transform={`translate(${s.x} ${s.y})`} onClick={() => setSel(s)} className="cursor-pointer" role="button" tabIndex={0}
                aria-label={`${s.n}. ${s.name}`} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSel(s); }}>
                {active && (
                  <g transform={`rotate(${s.dir})`}>
                    <path d="M0 0 L-46 -120 A128 128 0 0 1 46 -120 Z" fill={c} opacity={0.16} />
                  </g>
                )}
                <circle r={active ? 16 : 13} fill={active ? c : '#10151D'} stroke={c} strokeWidth="2" />
                <text y="4.5" textAnchor="middle" fontSize="12" fontWeight="700" fill={active ? '#07090D' : c}>{s.n}</text>
              </g>
            );
          })}
        </svg>
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-2 pb-1 text-[11px] text-ink-muted">
          {Object.values(ACCESS).map((a) => <span key={a.label} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: a.color }} />{a.label}</span>)}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={sel.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
          className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold text-bg" style={{ background: ACCESS[sel.access].color }}>{sel.n}</span>
            <div>
              <h3 className="text-lg font-semibold leading-tight">{sel.name}</h3>
              <p className="mt-1 text-xs" style={{ color: ACCESS[sel.access].color }}>{ACCESS[sel.access].label}</p>
            </div>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <div><dt className="label">Momentos</dt><dd>{sel.moments}</dd></div>
            <div><dt className="label">Lente</dt><dd>{sel.lens}</dd></div>
          </dl>
          <p className="label mt-4">O que fotografar daqui</p>
          <ul className="space-y-1.5 text-sm">{sel.shots.map((s) => <li key={s} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-neon" />{s}</li>)}</ul>
          <p className="label mt-4">Cuidados</p>
          <ul className="space-y-1.5 text-sm">{sel.care.map((s) => <li key={s} className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />{s}</li>)}</ul>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {SPOTS.map((s) => (
              <button key={s.id} onClick={() => setSel(s)} aria-label={s.name}
                className={cn('h-8 w-8 rounded-full border text-xs font-semibold transition-colors', sel.id === s.id ? 'border-neon bg-neon text-bg' : 'border-white/15 text-ink-muted hover:text-ink')}>{s.n}</button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ---------- Momentos da missa ---------- */
function Moments() {
  return (
    <ol className="relative space-y-3 border-l border-white/10 pl-6">
      {MASS_MOMENTS.map((m, i) => (
        <li key={m.name} className="relative">
          <span className={cn('absolute -left-[33px] top-3 flex h-4 w-4 items-center justify-center rounded-full border-2', m.flag ? 'border-warn bg-warn/20' : 'border-neon bg-bg')} />
          <div className={cn('rounded-2xl border p-4', m.flag ? 'border-warn/30 bg-warn/[0.05]' : 'border-white/[0.06] bg-white/[0.02]')}>
            <p className="flex flex-wrap items-center gap-2 font-semibold">
              <span className="text-xs text-ink-muted">{String(i + 1).padStart(2, '0')}</span>{m.name}
              {m.flag && <span className="rounded-full bg-warn/15 px-2 py-0.5 text-[11px] font-medium text-warn">silêncio total, sem se mover</span>}
            </p>
            <p className="mt-1 text-sm text-ink/90">{m.what}</p>
            <p className="mt-1 text-xs text-ink-muted">Onde: {m.where}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Quiz ---------- */
function Quiz({ questions, onPassed }: { questions: QuizQuestion[]; onPassed?: (score: number) => void }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [sent, setSent] = useState(false);
  const score = answers.filter((a, i) => a === questions[i].answer).length;
  const pct = Math.round((score / questions.length) * 100);
  const passed = pct >= 70;

  return (
    <div className="space-y-4">
      {questions.map((q, qi) => (
        <div key={q.q} className="rounded-3xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5">
          <p className="font-semibold"><span className="mr-2 text-neon">{qi + 1}.</span>{q.q}</p>
          <div className="mt-3 grid gap-2">
            {q.options.map((o, oi) => {
              const chosen = answers[qi] === oi;
              const right = sent && oi === q.answer;
              const wrong = sent && chosen && oi !== q.answer;
              return (
                <button key={o} disabled={sent} onClick={() => setAnswers(answers.map((a, i) => (i === qi ? oi : a)))}
                  className={cn('rounded-2xl border px-4 py-3 text-left text-sm transition-colors',
                    right ? 'border-neon/60 bg-neon/10' : wrong ? 'border-danger/60 bg-danger/10' : chosen ? 'border-electric/60 bg-electric/10' : 'border-white/[0.08] hover:border-white/20')}>
                  {o}
                </button>
              );
            })}
          </div>
          {sent && <p className={cn('mt-3 text-sm', answers[qi] === q.answer ? 'text-neon' : 'text-warn')}>{q.explain}</p>}
        </div>
      ))}
      {!sent ? (
        <Button variant="primary" disabled={answers.some((a) => a === null)} onClick={() => { setSent(true); if (pct >= 70) onPassed?.(pct); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          Ver resultado
        </Button>
      ) : (
        <div className={cn('flex flex-col gap-3 rounded-3xl border p-5 sm:flex-row sm:items-center sm:justify-between', passed ? 'border-neon/40 bg-neon/[0.06]' : 'border-warn/40 bg-warn/[0.06]')}>
          <div className="flex items-center gap-3">
            <Award className={cn('h-8 w-8', passed ? 'text-neon' : 'text-warn')} />
            <div>
              <p className="font-semibold">{score} de {questions.length} ({pct}%)</p>
              <p className="text-sm text-ink-muted">{passed ? 'Aprovado(a)! Seu certificado foi liberado.' : 'Precisa de 70% para o certificado. Revise as lições e tente de novo.'}</p>
            </div>
          </div>
          <Button icon={RotateCcw} onClick={() => { setAnswers(questions.map(() => null)); setSent(false); }}>Refazer</Button>
        </div>
      )}
    </div>
  );
}

export function CertificateButton() {
  return <Button icon={Printer} onClick={() => window.print()}>Imprimir certificado</Button>;
}
