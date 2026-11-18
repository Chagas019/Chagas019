import { createParish } from './actions';
import { createClient } from '@/lib/supabase/server';

export const metadata = { title: 'Começar' };

export default async function Comecar({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <main className="auth">
      <div className="auth-card">
        <div className="brand-mark"><span>✝</span>PARÓQUIA360</div>
        <h1>Cadastre sua paróquia</h1>
        <p>Você será a administração dela e poderá convidar o pároco, coordenadores e voluntários.</p>
        <div className="notice info">Foi convidado por alguém? Abra o link do convite que recebeu — você não precisa cadastrar nada aqui.</div>
        {erro && <div className="notice err" role="alert">{erro}</div>}
        <form action={createParish}>
          <label className="field">Nome da paróquia<input name="name" required minLength={3} maxLength={120} placeholder="Paróquia São José" /></label>
          <label className="field">Endereço no sistema (opcional)<input name="slug" maxLength={60} pattern="[a-z0-9-]{3,60}" placeholder="sao-jose-centro" /></label>
          <div className="field-row">
            <label className="field">Cidade<input name="city" maxLength={80} /></label>
            <label className="field">Diocese<input name="diocese" maxLength={120} /></label>
          </div>
          <button className="btn primary block" type="submit">Criar paróquia</button>
        </form>
        <form action="/auth/sair" method="post" style={{ marginTop: 16 }}>
          <span className="muted">Conectado como {user?.email}. </span>
          <button className="muted" style={{ textDecoration: 'underline' }}>Sair</button>
        </form>
      </div>
    </main>
  );
}
