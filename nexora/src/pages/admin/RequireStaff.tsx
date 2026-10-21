import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/hooks/useAuth';
import { PageFallback } from '@/components/layout/PageFallback';

/**
 * Guarda de rota do painel. É só conveniência de interface: quem realmente protege os dados são as
 * políticas RLS do banco (um usuário sem papel de equipe não lê nem grava nada privado, mesmo forçando a URL).
 */
export function RequireStaff({ children }: { children: ReactNode }) {
  const { isStaff, loading, user } = useAuth();
  const { pathname } = useLocation();
  if (loading) return <div className="bg-ink"><PageFallback /></div>;
  if (!isStaff) {
    if (user) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink px-6 text-center text-paper">
          <h1 className="text-display-sm font-medium">Acesso restrito à equipe</h1>
          <p className="max-w-md text-sm text-mist">Sua conta não tem permissão para o painel. Peça a um administrador para liberar o acesso.</p>
          <a href="/" className="btn-ghost border-white/15">Voltar ao site</a>
        </div>
      );
    }
    return <Navigate to="/entrar" replace state={{ from: pathname }} />;
  }
  return <>{children}</>;
}
