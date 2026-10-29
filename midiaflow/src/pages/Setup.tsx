import { Church, Sparkles } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Logo } from '@/components/layout/Logo';
import { Button, Field, Input } from '@/components/ui';
import { buildEmptyData } from '@/lib/demo-data';
import type { AppData } from '@/lib/types';

/** Primeiro acesso no modo local: cria a paróquia vazia, com você como administrador. */
export default function Setup({ onDone }: { onDone: (d: AppData) => void }) {
  const [name, setName] = useState('');
  const [parish, setParish] = useState('');
  const [city, setCity] = useState('');
  const [pascom, setPascom] = useState('');
  const [error, setError] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (parish.trim().length < 3) return setError('Informe o nome da paróquia.');
    if (name.trim().length < 3) return setError('Informe seu nome completo.');
    onDone(buildEmptyData({ parish: parish.trim(), city: city.trim(), pascom: pascom.trim(), name: name.trim() }));
  };

  return (
    <div className="ambient flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="card relative z-10 w-full max-w-md p-6 sm:p-8">
        <Logo />
        <span className="mt-8 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-neon/10 text-neon"><Church className="h-6 w-6" /></span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">Bem-vindo ao MídiaFlow</h1>
        <p className="mt-1 text-sm text-ink-muted">Vamos configurar a PASCOM da sua paróquia. Leva menos de um minuto.</p>
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <Field label="Nome da paróquia"><Input autoFocus value={parish} onChange={(e) => setParish(e.target.value)} placeholder="Ex.: Paróquia São José" /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Cidade"><Input value={city} onChange={(e) => setCity(e.target.value)} /></Field>
            <Field label="Nome da PASCOM"><Input value={pascom} onChange={(e) => setPascom(e.target.value)} placeholder="Opcional" /></Field>
          </div>
          <Field label="Seu nome completo" hint="Você será o administrador e poderá cadastrar a equipe."><Input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <Button type="submit" variant="primary" className="w-full">Começar</Button>
        </form>
        <p className="mt-5 text-center text-xs text-ink-muted">Os dados ficam salvos neste aparelho.</p>
        <a href="/?exemplo" className="mt-3 flex items-center justify-center gap-1.5 text-sm text-neon hover:underline">
          <Sparkles className="h-4 w-4" />Ver um exemplo antes
        </a>
      </div>
    </div>
  );
}
