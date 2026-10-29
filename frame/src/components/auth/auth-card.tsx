import { Logo } from "@/components/shell/logo";
import { Sparkle } from "@/components/ui/sparkle";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-cobalt-500 lg:block" aria-hidden>
        <Sparkle className="spin-slow absolute right-12 top-12 size-16 text-volt-500" />
        <div className="absolute inset-x-12 bottom-14">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-paper">
            <Sparkle className="size-3.5 text-volt-500" /> A rede social dos criadores visuais
          </p>
          <p className="mt-4 font-display text-[clamp(4rem,7vw,7.5rem)] leading-[0.86] text-volt-500">
            Sua criatividade
            <span className="block text-paper">merece um mundo inteiro</span>
          </p>
          <p className="mt-6 max-w-md text-paper/85">Mostre o resultado e o processo. Aprenda com quem cria. Encontre parceiros e desafios que fazem você evoluir.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="font-display text-5xl text-paper">{title}</h1>
          {subtitle ? <p className="mt-2 text-fog-400">{subtitle}</p> : null}
          <div className="mt-8">{children}</div>
          {footer ? <div className="mt-8 text-sm text-fog-400">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
