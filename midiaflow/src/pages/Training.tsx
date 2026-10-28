import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Award, Camera, CheckCircle2, Church, Circle, Clock, GraduationCap, MapPin, Share2, Smartphone, Video, Wand2, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { BlockView, CertificateButton } from '@/components/training/blocks';
import { Bar, Button, Card, PageHeader, ProgressRing, Select } from '@/components/ui';
import { useStore } from '@/lib/store';
import { MODULES, totalLessons, type TrainingModule } from '@/lib/training';
import { cn, fmt, toISODate } from '@/lib/utils';

const ICONS: Record<string, LucideIcon> = { Church, Smartphone, Camera, Video, MapPin, Wand2, Share2, Award };

interface Progress {
  done: string[];
  quiz?: { score: number; at: string };
}

/** Progresso da formação por integrante, salvo neste navegador. */
function useProgress(userId: string) {
  const key = `midiaflow:formacao:${userId}`;
  const read = (): Progress => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? '') as Progress;
    } catch {
      return { done: [] };
    }
  };
  const [p, setP] = useState<Progress>(read);
  // Recarrega ao trocar de usuário na demonstração.
  useEffect(() => setP(read()), [key]);
  const save = (next: Progress) => {
    setP(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* sem armazenamento */
    }
  };
  return {
    p,
    isDone: (m: string, l: string) => p.done.includes(`${m}/${l}`),
    toggle: (m: string, l: string) => {
      const k = `${m}/${l}`;
      save({ ...p, done: p.done.includes(k) ? p.done.filter((x) => x !== k) : [...p.done, k] });
    },
    markDone: (m: string, l: string) => {
      const k = `${m}/${l}`;
      if (!p.done.includes(k)) save({ ...p, done: [...p.done, k] });
    },
    passQuiz: (score: number) => save({ done: Array.from(new Set([...p.done, 'avaliacao/quiz'])), quiz: { score, at: new Date().toISOString() } }),
  };
}

const moduleMinutes = (m: TrainingModule) => m.lessons.reduce((a, l) => a + l.minutes, 0);

export default function Training() {
  const { moduleId, lessonId } = useParams();
  if (moduleId) return <LessonView moduleId={moduleId} lessonId={lessonId} />;
  return <Overview />;
}

function Overview() {
  const { me, parish } = useStore();
  const { p } = useProgress(me.id);
  const pct = Math.round((p.done.length / totalLessons) * 100);
  const next = MODULES.flatMap((m) => m.lessons.map((l) => ({ m, l }))).find(({ m, l }) => !p.done.includes(`${m.id}/${l.id}`));

  return (
    <div>
      <div className="no-print">
        <PageHeader title="Formação PASCOM" subtitle="Celular, câmera, vídeo, posições na igreja, edição e redes: tudo o que a equipe precisa para servir bem." />

        <Card className="relative mb-6 overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-neon/15 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <ProgressRing value={pct} size={104} stroke={9} />
            <div className="flex-1">
              <p className="eyebrow">Seu progresso</p>
              <p className="mt-2 text-xl font-semibold">{p.done.length} de {totalLessons} lições concluídas</p>
              <p className="mt-1 text-sm text-ink-muted">
                {MODULES.length} módulos · cerca de {Math.round(MODULES.reduce((a, m) => a + moduleMinutes(m), 0) / 60 * 10) / 10} h de conteúdo. O progresso fica salvo neste aparelho.
              </p>
            </div>
            {next && (
              <Link to={`/formacao/${next.m.id}/${next.l.id}`}>
                <Button variant="primary">{p.done.length ? 'Continuar' : 'Começar'} <ArrowRight className="h-4 w-4" /></Button>
              </Link>
            )}
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((m, i) => {
            const Icon = ICONS[m.icon] ?? GraduationCap;
            const done = m.lessons.filter((l) => p.done.includes(`${m.id}/${l.id}`)).length;
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={`/formacao/${m.id}`} className="card group flex h-full flex-col p-5 transition-all duration-300 hover:-translate-y-0.5">
                  <div className="flex items-start justify-between">
                    <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: `${m.color}18`, color: m.color }}>
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="text-xs text-ink-muted">Módulo {i + 1}</span>
                  </div>
                  <h2 className="mt-4 text-lg font-semibold tracking-tight group-hover:text-neon">{m.title}</h2>
                  <p className="mt-1 flex-1 text-sm text-ink-muted">{m.subtitle}</p>
                  <div className="mt-4 flex items-center gap-3 text-xs text-ink-muted">
                    <span>{m.level}</span>·<span>{m.lessons.length} lições</span>·<span className="flex items-center gap-1"><Clock className="h-3 w-3" />{moduleMinutes(m)} min</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Bar value={(done / m.lessons.length) * 100} />
                    <span className="text-xs text-ink-muted">{done}/{m.lessons.length}</span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {p.quiz && (
        <div className="mt-8">
          <div className="card mx-auto max-w-3xl overflow-hidden p-0">
            <div className="relative p-8 text-center sm:p-12">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-neon/[0.08] via-transparent to-electric/[0.08]" />
              <Award className="relative mx-auto h-12 w-12 text-neon" />
              <p className="eyebrow relative mt-4">Certificado de formação</p>
              <p className="relative mt-6 text-sm text-ink-muted">Certificamos que</p>
              <p className="relative mt-1 text-3xl font-bold tracking-tight">{me.name}</p>
              <p className="relative mx-auto mt-4 max-w-lg text-sm leading-relaxed text-ink-muted">
                concluiu a Formação PASCOM do MídiaFlow (celular, câmera, vídeo, posições na igreja, edição e redes), com aproveitamento de {p.quiz.score}% na avaliação final.
              </p>
              <p className="relative mt-6 text-sm">{parish.pascomName} · {parish.name}</p>
              <p className="relative text-xs text-ink-muted">{fmt(toISODate(new Date(p.quiz.at)), "d 'de' MMMM 'de' yyyy")}</p>
            </div>
          </div>
          <div className="no-print mt-4 flex justify-center"><CertificateButton /></div>
        </div>
      )}
    </div>
  );
}

function LessonView({ moduleId, lessonId }: { moduleId: string; lessonId?: string }) {
  const { me } = useStore();
  const nav = useNavigate();
  const prog = useProgress(me.id);
  const mIndex = MODULES.findIndex((m) => m.id === moduleId);
  const m = MODULES[mIndex];
  useEffect(() => window.scrollTo({ top: 0 }), [moduleId, lessonId]);
  if (!m) return <Navigate to="/formacao" replace />;
  const lIndex = Math.max(0, m.lessons.findIndex((l) => l.id === lessonId));
  const lesson = m.lessons[lIndex];
  const flat = MODULES.flatMap((mm) => mm.lessons.map((l) => ({ m: mm, l })));
  const pos = flat.findIndex((x) => x.m.id === m.id && x.l.id === lesson.id);
  const prev = flat[pos - 1];
  const next = flat[pos + 1];
  const Icon = ICONS[m.icon] ?? GraduationCap;
  const done = prog.isDone(m.id, lesson.id);
  const isQuiz = lesson.blocks.some((b) => b.t === 'quiz');

  return (
    <div>
      <Link to="/formacao" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink"><ArrowLeft className="h-4 w-4" />Formação</Link>
      <div className="mb-6 flex items-center gap-3">
        <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${m.color}18`, color: m.color }}><Icon className="h-6 w-6" /></span>
        <div>
          <p className="text-xs text-ink-muted">Módulo {mIndex + 1} · {m.title}</p>
          <h1 className="text-2xl font-bold tracking-tight">{lesson.title}</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        {/* Lições do módulo */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="lg:hidden">
            <Select aria-label="Lição" value={lesson.id} onChange={(e) => nav(`/formacao/${m.id}/${e.target.value}`)}>
              {m.lessons.map((l, i) => <option key={l.id} value={l.id}>{i + 1}. {l.title}{prog.isDone(m.id, l.id) ? ' ✓' : ''}</option>)}
            </Select>
          </div>
          <nav className="card hidden p-2 lg:block" aria-label="Lições do módulo">
            {m.lessons.map((l, i) => {
              const d = prog.isDone(m.id, l.id);
              return (
                <Link key={l.id} to={`/formacao/${m.id}/${l.id}`}
                  className={cn('flex items-start gap-2.5 rounded-2xl px-3 py-2.5 text-sm transition-colors', l.id === lesson.id ? 'bg-white/[0.07] text-ink' : 'text-ink-muted hover:text-ink')}>
                  {d ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-neon" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0" />}
                  <span><span className="block">{i + 1}. {l.title}</span><span className="text-xs text-ink-muted">{l.minutes} min</span></span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <article className="min-w-0">
          <Card className="space-y-6 p-5 sm:p-7">
            {lesson.blocks.map((b, i) => (
              <BlockView key={i} b={b} userId={me.id} onQuizPassed={(score) => { prog.passQuiz(score); toast.success('Parabéns! Certificado liberado na página da Formação.'); }} />
            ))}
          </Card>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {!isQuiz ? (
              <Button variant={done ? 'secondary' : 'outline'} icon={done ? CheckCircle2 : Circle} onClick={() => { prog.toggle(m.id, lesson.id); if (!done) toast.success('Lição concluída!'); }}>
                {done ? 'Concluída' : 'Marcar como concluída'}
              </Button>
            ) : <span />}
            <div className="flex gap-2">
              {prev && <Link to={`/formacao/${prev.m.id}/${prev.l.id}`}><Button icon={ArrowLeft}>Anterior</Button></Link>}
              {next ? (
                <Button variant="primary" onClick={() => { if (!isQuiz) prog.markDone(m.id, lesson.id); nav(`/formacao/${next.m.id}/${next.l.id}`); }}>
                  Próxima <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Link to="/formacao"><Button variant="primary">Ver certificado <Award className="h-4 w-4" /></Button></Link>
              )}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
