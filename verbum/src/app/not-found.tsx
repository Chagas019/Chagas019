import Link from "next/link";
import { Logo } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="paper flex min-h-screen flex-col items-center justify-center gap-6 bg-ivory-50 px-4 text-center">
      <Logo />
      <h1 className="font-serif text-3xl text-royal-900">Página não encontrada</h1>
      <p className="text-ink-soft">O endereço pode ter mudado. Volte ao início e continue a preparação.</p>
      <Link href="/painel" className="rounded-full bg-royal-800 px-5 py-2.5 font-semibold text-ivory-50">Ir para o início</Link>
    </div>
  );
}
