import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { errMsg } from '@/lib/format';

export const metadata = { title: 'Convite' };
const UUID = /^[0-9a-f-]{36}$/i;

async function accept(formData: FormData) {
  'use server';
  const token = String(formData.get('token'));
  if (!UUID.test(token)) redirect('/');
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('accept_invitation', { p_token: token });
  if (error) redirect(`/convite/${token}?erro=${encodeURIComponent(errMsg(error.message))}`);
  redirect(`/p/${data}`);
}

export default async function Convite({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ erro?: string }> }) {
  const { token } = await params;
  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <main className="auth">
      <div className="auth-card">
        <div className="brand-mark"><span>✝</span>PARÓQUIA360</div>
        <h1>Você foi convidado</h1>
        <p>Entre com o mesmo e-mail que recebeu o convite para participar da paróquia.</p>
        {erro && <div className="notice err" role="alert">{erro}</div>}
        {UUID.test(token) ? (
          <form action={accept}>
            <input type="hidden" name="token" value={token} />
            <p className="muted">Conectado como <b>{user?.email}</b>.</p>
            <button className="btn primary block" type="submit">Aceitar convite</button>
          </form>
        ) : <div className="notice err">Link de convite inválido.</div>}
        <form action="/auth/sair" method="post" style={{ marginTop: 16 }}>
          <button className="muted" style={{ textDecoration: 'underline' }}>Entrar com outro e-mail</button>
        </form>
      </div>
    </main>
  );
}
