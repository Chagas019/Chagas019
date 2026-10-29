import { Church, KeyRound, LogOut, Mail, UserPlus } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Logo } from '@/components/layout/Logo';
import { Button, Field, Input, Segmented } from '@/components/ui';
import { createParish, joinParish } from '@/lib/remote';
import { supabase } from '@/lib/supabase';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITE_KEY = 'midiaflow:convite';

/** Guarda o código do link de convite (?convite=XXXX) para usar depois do login. */
export function rememberInviteFromUrl() {
  try {
    const code = new URLSearchParams(location.search).get('convite');
    if (code) sessionStorage.setItem(INVITE_KEY, code.toUpperCase());
  } catch {
    /* sem armazenamento */
  }
}
const savedInvite = () => {
  try {
    return sessionStorage.getItem(INVITE_KEY) ?? '';
  } catch {
    return '';
  }
};

function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="ambient flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="card relative z-10 w-full max-w-md p-6 sm:p-8">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

const authMessage = (raw: string) => {
  if (/invalid login credentials/i.test(raw)) return 'E-mail ou senha incorretos.';
  if (/email not confirmed/i.test(raw)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if (/already registered|already exists/i.test(raw)) return 'Este e-mail já tem conta. Use “Entrar” ou “Esqueci minha senha”.';
  if (/password should be at least|weak password/i.test(raw)) return 'A senha precisa ter pelo menos 8 caracteres, com letras e números.';
  if (/provider is not enabled|unsupported provider/i.test(raw)) return 'Entrar com Google ainda não foi ativado pela administração. Use e-mail e senha.';
  if (/rate limit|too many/i.test(raw)) return 'Muitas tentativas. Aguarde alguns minutos e tente de novo.';
  if (/fetch|network/i.test(raw)) return 'Sem conexão. Verifique a internet.';
  return 'Não foi possível concluir. Tente novamente.';
};

function GoogleButton() {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      type="button"
      className="w-full"
      loading={loading}
      onClick={async () => {
        if (!supabase) return;
        setLoading(true);
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin } });
        if (error) {
          toast.error(authMessage(error.message));
          setLoading(false);
        }
      }}
    >
      <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
      Continuar com Google
    </Button>
  );
}

/* ---------------- Entrar / criar conta / recuperar ---------------- */
export default function Login() {
  const [mode, setMode] = useState<'entrar' | 'criar' | 'recuperar'>(savedInvite() ? 'criar' : 'entrar');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setError('');
    if (!EMAIL.test(email.trim())) return setError('Informe um e-mail válido.');
    if (mode === 'criar' && name.trim().length < 3) return setError('Informe seu nome completo.');
    if (mode !== 'recuperar' && (password.length < 8 || !/\d/.test(password) || !/[a-z]/i.test(password)))
      return setError(mode === 'criar' ? 'A senha precisa ter pelo menos 8 caracteres, com letras e números.' : 'Senha incorreta ou muito curta.');
    setLoading(true);
    try {
      if (mode === 'entrar') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) setError(authMessage(err.message));
      } else if (mode === 'criar') {
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: name.trim() }, emailRedirectTo: location.origin },
        });
        if (err) setError(authMessage(err.message));
        else if (!data.session) setSent(`Enviamos um link de confirmação para ${email.trim()}. Abra o e-mail e toque no link para ativar sua conta.`);
      } else {
        await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: location.origin });
        // Mesma resposta para e-mail existente ou não: não revela quem tem conta.
        setSent('Se este e-mail tiver conta, você vai receber um link para criar uma nova senha.');
      }
    } catch {
      setError('Sem conexão. Verifique a internet.');
    } finally {
      setLoading(false);
    }
  };

  if (sent)
    return (
      <Shell title="Confira seu e-mail" subtitle={sent}>
        <span className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-neon/10 text-neon"><Mail className="h-6 w-6" /></span>
        <Button className="w-full" onClick={() => { setSent(''); setMode('entrar'); }}>Voltar para o login</Button>
      </Shell>
    );

  return (
    <Shell
      title={mode === 'entrar' ? 'Entrar na equipe' : mode === 'criar' ? 'Criar sua conta' : 'Recuperar senha'}
      subtitle={savedInvite() ? 'Você recebeu um convite. Crie sua conta ou entre para participar da equipe.' : 'Sua equipe. Sua missão. Tudo conectado.'}
    >
      {mode !== 'recuperar' && (
        <Segmented className="mb-5 w-full [&>button]:flex-1 [&>button]:justify-center" value={mode} onChange={(v) => { setMode(v); setError(''); }}
          options={[{ value: 'entrar', label: 'Entrar' }, { value: 'criar', label: 'Criar conta' }]} />
      )}
      <form onSubmit={submit} className="space-y-4" noValidate>
        {mode === 'criar' && <Field label="Nome completo"><Input autoComplete="name" placeholder="Ex.: Maria Clara Souza" value={name} onChange={(e) => setName(e.target.value)} /></Field>}
        <Field label="E-mail"><Input type="email" inputMode="email" autoComplete="email" placeholder="nome@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        {mode !== 'recuperar' && (
          <Field label="Senha" hint={mode === 'criar' ? 'Mínimo de 8 caracteres, com letras e números.' : undefined}>
            <Input type="password" placeholder={mode === 'criar' ? 'Mínimo 8, com letras e números' : 'Sua senha'} autoComplete={mode === 'criar' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
        )}
        {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <Button type="submit" variant="primary" className="w-full" loading={loading}>
          {mode === 'entrar' ? 'Entrar' : mode === 'criar' ? 'Criar conta' : 'Enviar link'}
        </Button>
      </form>
      {mode !== 'recuperar' && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-ink-muted"><span className="h-px flex-1 bg-line" />ou<span className="h-px flex-1 bg-line" /></div>
          <GoogleButton />
        </>
      )}
      <button className="mt-5 w-full text-center text-sm text-neon hover:underline" onClick={() => { setMode(mode === 'recuperar' ? 'entrar' : 'recuperar'); setError(''); }}>
        {mode === 'recuperar' ? 'Voltar para o login' : 'Esqueci minha senha'}
      </button>
    </Shell>
  );
}

/* ---------------- Nova senha (link de recuperação) ---------------- */
export function NewPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  return (
    <Shell title="Criar nova senha" subtitle="Escolha uma senha nova para sua conta.">
      <form
        className="space-y-4"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (!supabase) return;
          if (password.length < 8 || !/\d/.test(password) || !/[a-z]/i.test(password)) return setError('Mínimo de 8 caracteres, com letras e números.');
          if (password !== confirm) return setError('As senhas não conferem.');
          setLoading(true);
          const { error: err } = await supabase.auth.updateUser({ password });
          setLoading(false);
          if (err) return setError(authMessage(err.message));
          toast.success('Senha alterada!');
          onDone();
        }}
      >
        <Field label="Nova senha"><Input type="password" placeholder="Mínimo 8, com letras e números" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <Field label="Repita a senha"><Input type="password" placeholder="Digite a mesma senha" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></Field>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <Button type="submit" variant="primary" className="w-full" loading={loading} icon={KeyRound}>Salvar senha</Button>
      </form>
    </Shell>
  );
}

/* ---------------- Primeiro acesso: entrar numa paróquia ou criar ---------------- */
export function Onboarding({ defaultName, email, onDone }: { defaultName: string; email: string; onDone: () => void }) {
  const [tab, setTab] = useState<'convite' | 'criar'>(savedInvite() ? 'convite' : 'convite');
  const [name, setName] = useState(defaultName);
  const [code, setCode] = useState(savedInvite());
  const [parish, setParish] = useState('');
  const [city, setCity] = useState('');
  const [pascom, setPascom] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 3) return setError('Informe seu nome completo.');
    if (tab === 'convite' && code.trim().length < 6) return setError('Informe o código de convite que a coordenação enviou.');
    if (tab === 'criar' && parish.trim().length < 3) return setError('Informe o nome da paróquia.');
    setLoading(true);
    try {
      if (tab === 'convite') await joinParish(code.trim(), name.trim());
      else await createParish({ name: parish.trim(), city: city.trim(), pascom: pascom.trim() || `PASCOM ${parish.trim()}`, fullName: name.trim() });
      try { sessionStorage.removeItem(INVITE_KEY); } catch { /* ok */ }
      toast.success(tab === 'convite' ? 'Bem-vindo(a) à equipe!' : 'Paróquia criada! Você é o administrador.');
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell title="Quase lá!" subtitle={`Conta ${email}. Agora ligue sua conta a uma paróquia.`}>
      <Segmented className="mb-5 w-full [&>button]:flex-1 [&>button]:justify-center" value={tab} onChange={(v) => { setTab(v); setError(''); }}
        options={[{ value: 'convite', label: 'Tenho um convite', icon: UserPlus }, { value: 'criar', label: 'Criar paróquia', icon: Church }]} />
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Seu nome completo"><Input autoComplete="name" placeholder="Ex.: Maria Clara Souza" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        {tab === 'convite' ? (
          <Field label="Código de convite" hint="Peça à coordenação da PASCOM. Ex.: 7F3K9QX2">
            <Input placeholder="7F3K9QX2" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-mono tracking-widest" maxLength={12} />
          </Field>
        ) : (
          <>
            <Field label="Nome da paróquia"><Input value={parish} onChange={(e) => setParish(e.target.value)} placeholder="Paróquia São José" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cidade"><Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex.: Belo Horizonte – MG" /></Field>
              <Field label="Nome da PASCOM"><Input value={pascom} onChange={(e) => setPascom(e.target.value)} placeholder="PASCOM São José" /></Field>
            </div>
            <p className="text-xs text-ink-muted">Quem cria a paróquia vira administrador e pode convidar o restante da equipe.</p>
          </>
        )}
        {error && <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        <Button type="submit" variant="primary" className="w-full" loading={loading}>{tab === 'convite' ? 'Entrar na equipe' : 'Criar paróquia'}</Button>
      </form>
      <button className="mt-5 flex w-full items-center justify-center gap-1.5 text-sm text-ink-muted hover:text-ink" onClick={() => supabase?.auth.signOut()}>
        <LogOut className="h-4 w-4" />Sair desta conta
      </button>
    </Shell>
  );
}
