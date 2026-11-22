import { isRouteErrorResponse, useRouteError } from 'react-router';
import { Logo } from './Logo';

/** Erro de rota (inclui falha ao baixar um pedaço do código depois de uma publicação nova) */
export function RouteError() {
  const err = useRouteError();
  const chunk = err instanceof Error && /dynamically imported module|Failed to fetch/i.test(err.message);
  const notFound = isRouteErrorResponse(err) && err.status === 404;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-ink px-6 text-center text-paper">
      <Logo />
      <h1 className="text-display-sm font-medium">{notFound ? 'Página não encontrada' : chunk ? 'Saiu uma versão nova do site' : 'Algo deu errado'}</h1>
      <p className="max-w-md text-sm text-mist">{chunk ? 'Recarregue para usar a versão mais recente.' : 'Tente recarregar a página. Se o problema continuar, volte para o início.'}</p>
      <div className="flex gap-3">
        <button type="button" className="btn-primary" onClick={() => location.reload()}>Recarregar</button>
        <a href="/" className="btn-ghost border-white/15">Ir para o início</a>
      </div>
    </div>
  );
}
