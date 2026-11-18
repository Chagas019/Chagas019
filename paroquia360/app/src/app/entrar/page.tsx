import Link from 'next/link';
import { login, signup } from './actions';
import { safeNext } from '@/lib/format';
import { SubmitButton } from '@/components/SubmitButton';

export const metadata = { title: 'Entrar' };

export default async function Entrar({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const criar = sp.modo === 'criar';
  const q = (modo: string) => `/entrar?modo=${modo}${sp.next ? `&next=${encodeURIComponent(next)}` : ''}`;
  return (
    <main className="auth">
      <div className="auth-card">
        <div className="brand-mark"><span>✝</span>PARÓQUIA360</div>
        <div role="tablist" style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <Link role="tab" aria-selected={!criar} className={`btn sm${!criar ? ' primary' : ''}`} href={q('entrar')}>Entrar</Link>
          <Link role="tab" aria-selected={criar} className={`btn sm${criar ? ' primary' : ''}`} href={q('criar')}>Criar conta</Link>
        </div>
        {sp.erro && <div className="notice err" role="alert">{sp.erro}</div>}
        {criar ? (
          <>
            <h1>Criar conta</h1>
            <p>Use o mesmo e-mail que recebeu o convite, se tiver um.</p>
            <form action={signup}>
              <input type="hidden" name="next" value={next} />
              <label className="field">Seu nome<input name="name" required minLength={2} maxLength={120} autoComplete="name" /></label>
              <label className="field">E-mail<input name="email" type="email" required autoComplete="email" inputMode="email" defaultValue={sp.email ?? ''} /></label>
              <label className="field">Senha (mínimo 8 caracteres)<input name="password" type="password" required minLength={8} autoComplete="new-password" /></label>
              <label className="field">Repita a senha<input name="password2" type="password" required minLength={8} autoComplete="new-password" /></label>
              <label className="muted" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 16 }}>
                <input type="checkbox" name="consent" required style={{ marginTop: 3 }} />
                <span>Li e aceito a <Link href="/privacidade" target="_blank">política de privacidade</Link>.</span>
              </label>
              <SubmitButton pending="Criando…">Criar conta</SubmitButton>
            </form>
          </>
        ) : (
          <>
            <h1>Entrar</h1>
            <p>Entre com seu e-mail e sua senha.</p>
            <form action={login}>
              <input type="hidden" name="next" value={next} />
              <label className="field">E-mail<input name="email" type="email" required autoComplete="email" inputMode="email" defaultValue={sp.email ?? ''} /></label>
              <label className="field">Senha<input name="password" type="password" required autoComplete="current-password" /></label>
              <SubmitButton pending="Entrando…">Entrar</SubmitButton>
            </form>
            <p className="muted" style={{ marginTop: 16 }}>Ainda não tem conta? <Link href={q('criar')}>Criar conta</Link></p>
          </>
        )}
      </div>
    </main>
  );
}
