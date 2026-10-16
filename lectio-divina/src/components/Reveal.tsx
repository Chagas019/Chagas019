import { useEffect, useRef, useState, type ReactNode } from 'react';

const ANIM = ['animate-fade-up', 'animate-fade-up-delay-1', 'animate-fade-up-delay-2', 'animate-fade-up-delay-3', 'animate-fade-up-delay-4'];

/** Faz o bloco subir e aparecer (mesma animação fade-up da abertura) quando entra na tela. */
export default function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: 0 | 1 | 2 | 3 | 4; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return setVisible(true);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const anim = ANIM[delay];
  return (
    <div ref={ref} className={`${visible ? anim : 'opacity-0'} ${className}`}>
      {children}
    </div>
  );
}
