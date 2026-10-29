import { AnimatePresence, motion } from 'framer-motion';
import { Check, Repeat, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useStore } from '@/lib/store';
import type { Slot, SlotStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button, Input } from '../ui';

/** Ações do integrante sobre a própria vaga. Nunca faz substituição automática. */
export function RespondButtons({ scheduleId, slot }: { scheduleId: string; slot: Slot }) {
  const { respond } = useStore();
  const [asking, setAsking] = useState<SlotStatus | null>(null);
  const [note, setNote] = useState('');
  const [burst, setBurst] = useState(0);

  const send = (status: SlotStatus, n?: string) => {
    respond(scheduleId, slot.id, status, n);
    setAsking(null);
    setNote('');
    if (status === 'confirmado') {
      setBurst((b) => b + 1);
      toast.success('Presença confirmada! Obrigado por servir. 🙏');
    } else {
      toast.info(status === 'recusado' ? 'Tudo bem! O coordenador foi avisado.' : 'Pedido de substituição enviado ao coordenador.', {
        description: 'A vaga ficou destacada para ele organizar a substituição.',
      });
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Button
            size="sm"
            variant={slot.status === 'confirmado' ? 'primary' : 'outline'}
            icon={Check}
            onClick={() => send('confirmado')}
            aria-pressed={slot.status === 'confirmado'}
          >
            {slot.status === 'confirmado' ? 'Presença confirmada' : 'Confirmar presença'}
          </Button>
          <AnimatePresence>
            {burst > 0 && (
              <motion.span
                key={burst}
                className="pointer-events-none absolute inset-0 rounded-full border-2 border-neon"
                initial={{ opacity: 0.9, scale: 1 }}
                animate={{ opacity: 0, scale: 1.5 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7 }}
              />
            )}
          </AnimatePresence>
        </div>
        <Button size="sm" variant="ghost" icon={X} className={cn(slot.status === 'recusado' && 'text-danger')} onClick={() => setAsking('recusado')}>
          Não poderei participar
        </Button>
        <Button size="sm" variant="ghost" icon={Repeat} className={cn(slot.status === 'substituicao' && 'text-electric')} onClick={() => setAsking('substituicao')}>
          Solicitar substituição
        </Button>
      </div>
      <AnimatePresence>
        {asking && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 flex gap-2 overflow-hidden"
            onSubmit={(e) => { e.preventDefault(); send(asking, note.trim() || undefined); }}
          >
            <Input autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motivo (opcional)" className="h-9" maxLength={140} />
            <Button size="sm" type="submit" variant="secondary">Enviar</Button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
