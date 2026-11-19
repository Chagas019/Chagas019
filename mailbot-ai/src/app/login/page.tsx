import { LoginForm } from './LoginForm';
import { Mascot } from '@/components/Mascot';
import { env, missingConfig } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default function Login() {
  if (env.supabaseConfigured()) return <LoginForm />;
  // Banco ainda não conectado: mostra o estado real em vez de um formulário que não funcionaria.
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <div className="card page" style={{ width: '100%', maxWidth: 440, padding: 24, borderRadius: 28 }}>
        <div style={{ height: 170, position: 'relative', margin: '-6px 0 4px' }}><Mascot /></div>
        <h1 style={{ fontSize: 26, letterSpacing: '-0.03em', margin: '0 0 6px', textAlign: 'center' }}>MAILBOT AI</h1>
        <p className="muted" style={{ textAlign: 'center', margin: '0 0 18px' }}>Sua caixa de entrada, sob controle da inteligência artificial.</p>
        <div className="notice warn" role="status">
          <b>Instalação em andamento.</b> O banco de dados do MAILBOT ainda não foi conectado a este servidor, então o login está desativado.
        </div>
        <p className="tiny faint" style={{ marginTop: 14 }}>Configuração pendente: {missingConfig().join(', ')}</p>
      </div>
    </main>
  );
}
