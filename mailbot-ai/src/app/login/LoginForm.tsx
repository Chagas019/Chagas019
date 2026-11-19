'use client';
import { useState } from 'react';
import { Mascot } from '@/components/Mascot';
import { browserClient } from '@/lib/supabase/browser';

const ERRORS: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou senha incorretos.',
  'Email not confirmed': 'Confirme seu e-mail antes de entrar (verifique sua caixa de entrada).',
  'User already registered': 'Este e-mail já tem conta. Entre com sua senha.',
};

export function LoginForm() {
  const [mode, setMode] = useState<'entrar' | 'criar'>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const rawNext = params?.get('next') ?? '/';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const sb = browserClient();
    if (mode === 'entrar') {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) { setMsg({ kind: 'err', text: ERRORS[error.message] ?? error.message }); setBusy(false); return; }
      window.location.href = next;
      return;
    }
    const { data, error } = await sb.auth.signUp({
      email: email.trim(), password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setMsg({ kind: 'err', text: ERRORS[error.message] ?? error.message }); setBusy(false); return; }
    if (data.session) { window.location.href = next; return; }
    setMsg({ kind: 'ok', text: 'Conta criada! Confirme seu e-mail pelo link enviado e depois entre com sua senha.' });
    setMode('entrar');
    setBusy(false);
  }

  async function google() {
    const { error } = await browserClient().auth.signInWithOAuth({
      provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) setMsg({ kind: 'err', text: error.message });
  }

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div className="card page" style={{ width: '100%', maxWidth: 420, padding: 24, borderRadius: 28 }}>
        <div style={{ height: 170, position: 'relative', margin: '-6px 0 4px' }}><Mascot /></div>
        <h1 style={{ fontSize: 26, letterSpacing: '-0.03em', margin: '0 0 6px', textAlign: 'center' }}>MAILBOT AI</h1>
        <p className="muted" style={{ textAlign: 'center', margin: '0 0 20px' }}>Sua caixa de entrada, sob controle da inteligência artificial.</p>
        {params?.get('excluido') && <div className="notice ok" style={{ marginBottom: 14 }}>Seus dados foram excluídos.</div>}
        {params?.get('erro') && <div className="notice err" style={{ marginBottom: 14 }}>Não foi possível concluir o acesso. Tente novamente.</div>}

        <nav className="chips" style={{ margin: '0 0 6px', padding: 0, justifyContent: 'center' }}>
          <button type="button" className="chip" aria-current={mode === 'entrar' ? 'true' : undefined} onClick={() => { setMode('entrar'); setMsg(null); }}>Entrar</button>
          <button type="button" className="chip" aria-current={mode === 'criar' ? 'true' : undefined} onClick={() => { setMode('criar'); setMsg(null); }}>Criar conta</button>
        </nav>

        <form onSubmit={submit}>
          <div className="field">
            <label className="label" htmlFor="email">E-mail</label>
            <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" autoComplete="email" />
          </div>
          <div className="field">
            <label className="label" htmlFor="password">Senha</label>
            <input id="password" className="input" type="password" required minLength={mode === 'criar' ? 8 : 1} value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'criar' ? 'Mínimo de 8 caracteres' : 'Sua senha'} autoComplete={mode === 'criar' ? 'new-password' : 'current-password'} />
          </div>
          <button className="btn btn-block" style={{ marginTop: 16 }} disabled={busy}>
            {busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        {msg && <div className={`notice ${msg.kind}`} style={{ marginTop: 12 }} role="status">{msg.text}</div>}

        <div className="row" style={{ margin: '16px 0', gap: 12 }}><span className="divider" style={{ flex: 1, margin: 0 }} /><span className="tiny faint">ou</span><span className="divider" style={{ flex: 1, margin: 0 }} /></div>
        <button className="btn btn-ghost btn-block" onClick={google} type="button">Entrar com Google</button>

        <p className="tiny faint" style={{ textAlign: 'center', marginTop: 18 }}>
          Ao continuar você concorda com a <a href="/privacidade" style={{ textDecoration: 'underline' }}>política de privacidade</a>. Acesso ao Gmail somente leitura.
        </p>
      </div>
    </main>
  );
}
