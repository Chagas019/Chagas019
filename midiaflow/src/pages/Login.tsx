import { useState } from 'react';
import { toast } from 'sonner';
import { Logo } from '@/components/layout/Logo';
import { Button, Card, Field, Input } from '@/components/ui';
import { supabase } from '@/lib/supabase';

/** Tela de login real — só é usada quando o Supabase está configurado. */
export default function Login() {
  const [mode, setMode] = useState<'entrar' | 'recuperar'>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Informe um e-mail válido.');
    setLoading(true);
    try {
      if (mode === 'entrar') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        // Mensagem genérica: não revela se o e-mail existe.
        if (err) setError('E-mail ou senha incorretos.');
      } else {
        await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/configuracoes` });
        toast.success('Se o e-mail estiver cadastrado, você receberá um link para redefinir a senha.');
        setMode('entrar');
      }
    } catch {
      setError('Não foi possível conectar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ambient flex min-h-dvh items-center justify-center px-4">
      <Card className="relative z-10 w-full max-w-sm p-7">
        <Logo />
        <h1 className="mt-8 text-xl font-bold tracking-tight">{mode === 'entrar' ? 'Entrar na equipe' : 'Recuperar senha'}</h1>
        <p className="mt-1 text-sm text-ink-muted">Sua equipe. Sua missão. Tudo conectado.</p>
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <Field label="E-mail"><Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          {mode === 'entrar' && <Field label="Senha"><Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button type="submit" variant="primary" className="w-full" loading={loading}>{mode === 'entrar' ? 'Entrar' : 'Enviar link'}</Button>
        </form>
        <button className="mt-4 w-full text-center text-sm text-neon hover:underline" onClick={() => { setMode(mode === 'entrar' ? 'recuperar' : 'entrar'); setError(''); }}>
          {mode === 'entrar' ? 'Esqueci minha senha' : 'Voltar para o login'}
        </button>
      </Card>
    </div>
  );
}
