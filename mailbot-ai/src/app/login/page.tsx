'use client';
import { useState } from 'react';
import { Mascot } from '@/components/Mascot';
import { browserClient } from '@/lib/supabase/browser';

export default function Login() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [err, setErr] = useState('');
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const next = params?.get('next') ?? '/';
  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function magic(e: React.FormEvent) {
    e.preventDefault();
    setState('sending'); setErr('');
    const { error } = await browserClient().auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo() } });
    if (error) { setState('error'); setErr(error.message); } else setState('sent');
  }
  async function google() {
    const { error } = await browserClient().auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo() } });
    if (error) { setState('error'); setErr(error.message); }
  }

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div className="card page" style={{ width: '100%', maxWidth: 420, padding: 24, borderRadius: 28 }}>
        <div style={{ height: 190, position: 'relative', margin: '-6px 0 4px' }}><Mascot /></div>
        <h1 style={{ fontSize: 26, letterSpacing: '-0.03em', margin: '0 0 6px', textAlign: 'center' }}>MAILBOT AI</h1>
        <p className="muted" style={{ textAlign: 'center', margin: '0 0 22px' }}>Sua caixa de entrada, sob controle da inteligência artificial.</p>
        {params?.get('excluido') && <div className="notice ok" style={{ marginBottom: 14 }}>Seus dados foram excluídos.</div>}
        {params?.get('erro') && <div className="notice err" style={{ marginBottom: 14 }}>O link de acesso expirou ou é inválido. Peça um novo.</div>}
        {state === 'sent' ? (
          <div className="notice ok">Enviamos um link de acesso para <b>{email}</b>. Abra-o neste dispositivo.</div>
        ) : (
          <>
            <button className="btn btn-block" onClick={google} type="button">Entrar com Google</button>
            <div className="row" style={{ margin: '16px 0', gap: 12 }}><span className="divider" style={{ flex: 1, margin: 0 }} /><span className="tiny faint">ou</span><span className="divider" style={{ flex: 1, margin: 0 }} /></div>
            <form onSubmit={magic}>
              <label className="label" htmlFor="email">E-mail</label>
              <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" autoComplete="email" />
              <button className="btn btn-ghost btn-block" style={{ marginTop: 12 }} disabled={state === 'sending'}>{state === 'sending' ? 'Enviando…' : 'Receber link de acesso'}</button>
            </form>
          </>
        )}
        {state === 'error' && <div className="notice err" style={{ marginTop: 12 }}>{err}</div>}
        <p className="tiny faint" style={{ textAlign: 'center', marginTop: 18 }}>
          Ao continuar você concorda com a <a href="/privacidade" style={{ textDecoration: 'underline' }}>política de privacidade</a>. Acesso ao Gmail somente leitura.
        </p>
      </div>
    </main>
  );
}
