import Link from 'next/link';
import { sendLink } from './actions';
import { safeNext } from '@/lib/format';

export const metadata = { title: 'Entrar' };
const ERR: Record<string, string> = {
  email: 'Digite um e-mail válido.',
  consent: 'Para continuar, aceite a política de privacidade.',
  envio: 'Não foi possível enviar o link agora. Aguarde um minuto e tente de novo.',
  link: 'O link expirou ou já foi usado. Peça um novo.',
};

export default async function Entrar({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  return (
    <main className="auth">
      <div className="auth-card">
        <div className="brand-mark"><span>✝</span>PARÓQUIA360</div>
        {sp.enviado ? (
          <>
            <h1>Confira seu e-mail</h1>
            <p>Enviamos um link de acesso. Abra-o neste mesmo aparelho para entrar. Ele vale por alguns minutos.</p>
            <Link className="btn" href="/entrar">Usar outro e-mail</Link>
          </>
        ) : (
          <>
            <h1>Entrar</h1>
            <p>Sem senha: enviamos um link de acesso para o seu e-mail.</p>
            {sp.erro && <div className="notice err" role="alert">{ERR[sp.erro] ?? ERR.envio}</div>}
            <form action={sendLink}>
              <input type="hidden" name="next" value={next} />
              <label className="field">E-mail<input name="email" type="email" required autoComplete="email" inputMode="email" /></label>
              <label className="muted" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 16 }}>
                <input type="checkbox" name="consent" required style={{ marginTop: 3 }} />
                <span>Li e aceito a <Link href="/privacidade" target="_blank">política de privacidade</Link>.</span>
              </label>
              <button className="btn primary block" type="submit">Enviar link de acesso</button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
