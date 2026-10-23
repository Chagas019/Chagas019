'use client';

import { Bluetooth, Gamepad2 } from 'lucide-react';
import Link from 'next/link';
import { useGamepads } from '@/lib/gamepads';

/** Chamada para a área de controle, já detectando controles de verdade. */
export function ControllerTeaser() {
  const pads = useGamepads();
  return (
    <div className="panel relative grid gap-6 overflow-hidden p-6 sm:p-10 md:grid-cols-[1fr_auto] md:items-center">
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgb(56_214_245/0.25),transparent_65%)]" aria-hidden="true" />
      <div>
        <p className="eyebrow flex items-center gap-2"><Bluetooth className="h-4 w-4" aria-hidden="true" /> Controle Bluetooth</p>
        <h3 className="mt-2 text-2xl font-bold sm:text-3xl">Pareie, teste e mapeie seu controle</h3>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
          Pareie o controle nas configurações de Bluetooth do celular e aperte qualquer botão. Controles de Xbox,
          DualShock 4 e DualSense costumam ser reconhecidos no Chrome (Android) e no Safari (iPhone com iOS recente).
        </p>
        <p className="mt-4 text-sm" role="status" aria-live="polite">
          {pads.length > 0 ? (
            <span className="text-ok">● {pads.length === 1 ? '1 controle conectado' : `${pads.length} controles conectados`}: {pads[0].id.slice(0, 60)}</span>
          ) : (
            <span className="text-faint">Nenhum controle detectado nesta página ainda.</span>
          )}
        </p>
      </div>
      <Link href="/controle" className="btn btn-primary h-14 px-7">
        <Gamepad2 className="h-5 w-5" aria-hidden="true" /> Testar controle
      </Link>
    </div>
  );
}
