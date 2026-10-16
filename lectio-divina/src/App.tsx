import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Award, Crown, X } from 'lucide-react';
import { useLectio, useLocalStorage, useToday } from './hooks';
import { shortDate, weekday } from './lib/dates';
import { streak } from './lib/progress';
import LectioToday from './components/LectioToday';
import CalendarSection from './components/CalendarSection';
import StepsSection from './components/StepsSection';
import ReminderSection from './components/ReminderSection';
import Footer from './components/Footer';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260606_154941_df1a96e1-a06f-450c-bd02-d863414cc1a0.mp4';

const NAV_LINKS = [
  { label: 'Hoje', href: '#hoje' },
  { label: 'Calendário', href: '#calendario' },
  { label: 'Os Passos', href: '#passos' },
  { label: 'Lembrete', href: '#lembrete' },
];

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const today = useToday();
  const [selected, setSelected] = useState(today);
  const [doneList, setDoneList] = useLocalStorage<string[]>('lectio:feitos', []);
  const done = useMemo(() => new Set(doneList), [doneList]);
  const todayLectio = useLectio(today);

  // Quando vira o dia, quem estava olhando "hoje" passa para o novo dia sozinho.
  const lastToday = useRef(today);
  useEffect(() => {
    if (lastToday.current !== today) {
      setSelected((s) => (s === lastToday.current ? today : s));
      lastToday.current = today;
    }
  }, [today]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
  }, [menuOpen]);

  const toggleDone = (iso: string) =>
    setDoneList((list) => (list.includes(iso) ? list.filter((d) => d !== iso) : [...list, iso]));

  const openDay = (iso: string) => {
    setSelected(iso);
    document.getElementById('hoje')?.scrollIntoView({ behavior: 'smooth' });
  };

  const stats = [
    { value: shortDate(today), label: `Hoje, ${weekday(today)}` },
    {
      value: todayLectio.status === 'ok' ? todayLectio.data.evangelho.referencia : '—',
      label: 'Evangelho do dia',
    },
    { value: String(streak(done, today)), label: 'Dias seguidos' },
  ];

  return (
    <>
      <section className="relative h-screen min-h-[640px] w-full overflow-hidden">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={VIDEO_URL}
          autoPlay
          muted
          loop
          playsInline
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10" />

        <div className="relative z-10 flex h-full flex-col">
          {/* Navbar */}
          <nav className="flex items-center justify-between px-6 sm:px-10 lg:px-16 py-5 lg:py-7">
            <a href="#" className="font-podium text-white font-bold uppercase text-2xl sm:text-3xl tracking-wider">
              Lectio Divina
            </a>

            <div className="hidden md:flex items-center gap-8 lg:gap-12">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="font-inter text-sm text-white/80 tracking-widest uppercase hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <a
              href="#hoje"
              className="hidden md:inline-flex items-center gap-2 border border-white/30 hover:border-white/60 hover:bg-white/10 px-6 py-3 font-inter text-xs text-white tracking-widest uppercase transition-all"
            >
              Ler hoje
              <ArrowUpRight className="w-4 h-4" />
            </a>

            <button
              type="button"
              className="md:hidden space-y-1.5 p-2 -mr-2"
              aria-label="Abrir menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <div className="w-6 h-0.5 bg-white" />
              <div className="w-6 h-0.5 bg-white" />
              <div className="w-4 h-0.5 bg-white" />
            </button>
          </nav>

          {/* Hero */}
          <div className="flex flex-1 flex-col justify-center px-6 sm:px-10 lg:px-16 pb-10">
            <div className="animate-fade-up flex items-center gap-3 mb-6 lg:mb-8">
              <Crown className="w-4 h-4 text-white/70" />
              <span className="text-white/70 text-xs sm:text-sm font-inter tracking-[0.3em] uppercase">
                Lectio Divina Diária
              </span>
            </div>

            <h1 className="animate-fade-up-delay-1 font-podium text-white uppercase leading-[0.92] tracking-tight">
              <span className="block text-[clamp(2.8rem,8vw,7rem)]">Leia.</span>
              <span className="block text-[clamp(2.8rem,8vw,7rem)]">Medite.</span>
              <span className="block text-[clamp(2.8rem,8vw,7rem)]">Ore.</span>
            </h1>

            <p className="animate-fade-up-delay-2 mt-6 lg:mt-8 text-white/70 text-sm sm:text-base font-inter leading-relaxed max-w-md">
              A Palavra de Deus de cada dia,
              <br />
              para ler devagar e rezar —{' '}
              <strong className="text-white font-semibold">sem se perder.</strong>
            </p>

            <div className="animate-fade-up-delay-3 mt-8 lg:mt-10 flex flex-wrap items-center gap-4 sm:gap-6">
              <a
                href="#hoje"
                className="group inline-flex items-center gap-2 bg-black hover:bg-neutral-900 px-5 sm:px-7 py-3 sm:py-4 font-inter text-[11px] sm:text-xs text-white tracking-widest uppercase transition-colors"
              >
                Ler a Lectio de hoje
                <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
              <div className="hidden sm:flex items-center gap-3">
                <Award className="w-8 h-8 text-white/50" />
                <div className="text-white/60 text-xs tracking-wider uppercase font-inter leading-snug">
                  <div>Atualiza</div>
                  <div>todo dia</div>
                </div>
              </div>
            </div>

            <div className="animate-fade-up-delay-4 mt-8 sm:mt-10 lg:mt-14 flex flex-wrap gap-6 sm:gap-12 lg:gap-16">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="font-inter text-white text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                    {s.value}
                  </div>
                  <div className="text-white/50 text-[9px] sm:text-xs tracking-widest uppercase mt-1 font-inter">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Menu do celular */}
      <div
        className={`md:hidden fixed inset-0 z-50 bg-black/95 backdrop-blur-sm transition-all duration-500 ${
          menuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        aria-hidden={!menuOpen}
      >
        <div className="flex items-center justify-between px-6 sm:px-10 py-5">
          <span className="font-podium text-white font-bold uppercase text-2xl sm:text-3xl tracking-wider">
            Lectio Divina
          </span>
          <button type="button" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} className="p-2 -mr-2">
            <X className="w-7 h-7 text-white" />
          </button>
        </div>
        <div className="flex h-[calc(100%-88px)] flex-col justify-center gap-6 px-6 sm:px-10">
          {NAV_LINKS.map((link, i) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="font-podium text-4xl sm:text-5xl text-white uppercase transition-all duration-500"
              style={{
                transitionDelay: `${menuOpen ? i * 80 + 100 : 0}ms`,
                opacity: menuOpen ? 1 : 0,
                transform: menuOpen ? 'translateY(0)' : 'translateY(20px)',
              }}
            >
              {link.label}
            </a>
          ))}
          <a
            href="#hoje"
            onClick={() => setMenuOpen(false)}
            className="mt-6 inline-flex w-fit items-center gap-2 border border-white/30 hover:border-white/60 hover:bg-white/10 px-6 py-3 font-inter text-xs text-white tracking-widest uppercase transition-all duration-500"
            style={{
              transitionDelay: `${menuOpen ? NAV_LINKS.length * 80 + 100 : 0}ms`,
              opacity: menuOpen ? 1 : 0,
              transform: menuOpen ? 'translateY(0)' : 'translateY(20px)',
            }}
          >
            Ler hoje
            <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      <main>
        <LectioToday
          iso={selected}
          today={today}
          onChangeDay={setSelected}
          isDone={done.has(selected)}
          onToggleDone={() => toggleDone(selected)}
        />
        <CalendarSection today={today} selected={selected} done={done} onPick={openDay} />
        <StepsSection />
        <ReminderSection />
      </main>
      <Footer />
    </>
  );
}
