import { AnimatePresence, motion } from 'framer-motion';
import { Eye, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSkyline } from '../../state/store';

const SHORTCUTS: [string, string][] = [
  ['1 · 2 · 3 · 4 · 5', 'Visão geral, superior, inferior, frontal, lateral'],
  ['E', 'Vista explodida'],
  ['N', 'Alternar dia · pôr do sol · noite'],
  ['↑ ↓', 'Pavimento acima / abaixo'],
  ['C · A · G', 'Cobertura, apartamento, garagem'],
  ['T', 'Apresentação guiada'],
  ['F', 'Tela cheia'],
  ['H', 'Ocultar / mostrar interface'],
  ['R', 'Reiniciar câmera'],
  ['Esc', 'Voltar à visão geral'],
];

export function HelpOverlay() {
  const open = useSkyline((s) => s.helpOpen);
  const close = () => useSkyline.getState().setHelpOpen(false);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) btn.current?.focus();
  }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal" role="dialog" aria-modal="true" aria-labelledby="help-title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close}>
          <motion.div className="modal__card" initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal__head">
              <h2 id="help-title">Como explorar a maquete</h2>
              <button ref={btn} type="button" className="icon-btn" onClick={close} aria-label="Fechar ajuda"><X size={18} /></button>
            </div>
            <div className="help-grid">
              <section>
                <h3>Mouse</h3>
                <ul>
                  <li><b>Arrastar</b> gira o edifício em 360°</li>
                  <li><b>Roda</b> aproxima e afasta</li>
                  <li><b>Botão direito</b> ou <b>Shift + arrastar</b> desloca a vista</li>
                  <li><b>Clique num andar</b> isola o pavimento; clique de novo numa unidade para vê-la</li>
                </ul>
              </section>
              <section>
                <h3>Toque</h3>
                <ul>
                  <li><b>Um dedo</b> gira</li>
                  <li><b>Pinça</b> aproxima e afasta</li>
                  <li><b>Dois dedos</b> deslocam a vista</li>
                  <li><b>Toque num andar</b> para selecioná-lo</li>
                </ul>
              </section>
              <section className="help-grid__wide">
                <h3>Atalhos de teclado</h3>
                <dl className="kbd-list">
                  {SHORTCUTS.map(([k, d]) => (
                    <div key={k}><dt><kbd>{k}</kbd></dt><dd>{d}</dd></div>
                  ))}
                </dl>
              </section>
            </div>
            <p className="note">Projeto conceitual: medidas, áreas e quantidades são exemplos editáveis, sem validação técnica.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Toast() {
  const toast = useSkyline((s) => s.toast);
  const [shown, setShown] = useState<typeof toast>(null);
  useEffect(() => {
    if (!toast) return;
    setShown(toast);
    const t = setTimeout(() => setShown(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <div className="toast-wrap" aria-live="polite">
      <AnimatePresence>
        {shown && (
          <motion.div key={shown.id} className="toast" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
            {shown.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ShowUiButton() {
  return (
    <button type="button" className="pill-btn show-ui" onClick={() => useSkyline.getState().setUiHidden(false)}>
      <Eye size={15} /> <span>Mostrar interface</span>
    </button>
  );
}

const STEPS = ['Preparando a cena', 'Gerando os 40 pavimentos', 'Modelando cobertura e paisagismo', 'Calculando iluminação e reflexos', 'Compilando materiais'];

/** Indicador de carregamento com progresso real (módulo 3D baixado → GPU → primeiros quadros). */
export function LoadingOverlay({ stage }: { stage: 'script' | 'gpu' | 'ready' }) {
  const ready = useSkyline((s) => s.ready);
  const [p, setP] = useState(4);
  useEffect(() => {
    if (ready) {
      setP(100);
      return;
    }
    const cap = stage === 'script' ? 58 : 94;
    const id = setInterval(() => setP((v) => (v < cap ? v + Math.max(0.6, (cap - v) * 0.07) : v)), 90);
    return () => clearInterval(id);
  }, [stage, ready]);
  const label = STEPS[Math.min(STEPS.length - 1, Math.floor((p / 100) * STEPS.length))];
  return (
    <AnimatePresence>
      {!ready && (
        <motion.div className="loader" role="status" aria-live="polite" initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.9 } }}>
          <div className="loader__mark" aria-hidden="true">
            {Array.from({ length: 10 }, (_, i) => (
              <i key={i} style={{ animationDelay: `${(9 - i) * 0.09}s` }} />
            ))}
          </div>
          <div className="loader__name">SKYLINE<b>40</b></div>
          <div className="loader__bar"><i style={{ transform: `scaleX(${p / 100})` }} /></div>
          <div className="loader__txt">{label}… {Math.round(p)}%</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
