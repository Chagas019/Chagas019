/**
 * Saúde do servidor web. Usado pelo indicador de conexão para medir o RTT
 * real até o servidor. Não expõe versão, ambiente nem dados internos.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(
    { ok: true, service: 'web', time: Date.now() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
