import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="auth"><div className="auth-card">
      <h1>Página não encontrada</h1>
      <p>O endereço não existe ou é de uma paróquia da qual você ainda não faz parte. Se recebeu um convite, abra o link do convite.</p>
      <Link className="btn primary" href="/">Voltar ao início</Link>
    </div></main>
  );
}
