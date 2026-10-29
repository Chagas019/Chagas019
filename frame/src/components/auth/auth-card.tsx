import { Logo } from "@/components/shell/logo";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden lg:block" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(800px_500px_at_30%_30%,rgb(124_58_237/0.35),transparent_60%),radial-gradient(700px_500px_at_80%_80%,rgb(59_130_246/0.25),transparent_60%)]" />
        <div className="absolute inset-10 rounded-[var(--radius-xl)] border border-white/10" />
        <div className="absolute inset-x-16 bottom-16">
          <p className="font-display text-6xl leading-[0.95] text-paper">
            Sua criatividade
            <br />
            <em className="text-volt-300">merece um mundo inteiro.</em>
          </p>
          <p className="mt-6 max-w-md text-fog-400">Mostre o resultado e o processo. Aprenda com quem cria. Encontre parceiros e desafios que fazem você evoluir.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="font-display text-4xl text-paper">{title}</h1>
          {subtitle ? <p className="mt-2 text-fog-400">{subtitle}</p> : null}
          <div className="mt-8">{children}</div>
          {footer ? <div className="mt-8 text-sm text-fog-400">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
