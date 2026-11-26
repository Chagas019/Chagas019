import Link from "next/link";
import { config } from "@/lib/config";

/** Faixa que identifica claramente o modo de demonstração (dados locais e/ou pagamentos simulados). */
export function DemoBanner() {
  const local = config.backend === "local";
  const devPay = config.payments === "dev";
  if (!local && !devPay) return null;
  return (
    <div role="note" className="border-b border-signal/40 bg-bone text-ink">
      <div className="container-lab flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-1.5 text-center text-xs font-medium">
        <span className="lab-label">Modo demonstração</span>
        <span>
          {local ? "Dados locais de desenvolvimento" : "Dados reais"}
          {devPay ? " · pagamentos SIMULADOS, nenhuma cobrança real" : ""}
          {" · produtos marcados como demonstração"}
        </span>
        {local && (
          <Link href="/dev/emails" className="underline underline-offset-2">
            Caixa de e-mails local
          </Link>
        )}
      </div>
    </div>
  );
}
