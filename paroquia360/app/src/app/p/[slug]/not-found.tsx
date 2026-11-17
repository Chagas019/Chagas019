import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="auth"><div className="auth-card">
      <h1>Paróquia não encontrada</h1>
      <p>Ela não existe ou você ainda não faz parte dela. Se recebeu um convite, abra o link do convite.</p>
      <Link className="btn primary" href="/">Voltar ao início</Link>
    </div></main>
  );
}
