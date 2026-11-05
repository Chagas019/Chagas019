"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, MailCheck } from "lucide-react";
import { useApp } from "@/lib/store";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/bits";
import { RefArt } from "@/components/art/RefArt";
import { REFERENCES } from "@/lib/content/references";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function AuthForm({ mode }: { mode: "entrar" | "cadastro" }) {
  const { signIn, signUp, status, backend } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/inicio";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (status === "ready") router.replace(safeNext);
  }, [status, router, safeNext]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === "cadastro" && name.trim().length < 2) return setError("Informe seu nome.");
    if (!EMAIL_RE.test(email.trim())) return setError("Informe um e-mail válido.");
    if (password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    setLoading(true);
    try {
      if (mode === "entrar") {
        await signIn(email, password);
      } else {
        const res = await signUp(name, email, password);
        if (res === "confirm-email") setConfirm(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível continuar.");
    } finally {
      setLoading(false);
    }
  };

  const art = REFERENCES[mode === "entrar" ? 5 : 16];

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      {/* Painel visual */}
      <aside className="relative hidden overflow-hidden border-r border-line lg:block">
        <RefArt {...art} className="absolute inset-0 h-full w-full opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" aria-label="Voltar para a página inicial">
            <Logo />
          </Link>
          <div>
            <p className="display max-w-lg text-6xl">
              Ideias não nascem <span className="accent-serif text-lime">prontas.</span>
            </p>
            <p className="mt-4 text-fog">Elas são desenvolvidas — um desafio por dia.</p>
          </div>
        </div>
      </aside>

      <section className="flex flex-col justify-center px-5 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="mb-12 inline-block lg:hidden" aria-label="Voltar para a página inicial">
            <Logo />
          </Link>

          {confirm ? (
            <div className="card p-8 text-center">
              <MailCheck className="mx-auto mb-4 size-10 text-lime" />
              <h1 className="display text-3xl">Confira seu e-mail</h1>
              <p className="mt-3 text-sm text-fog">
                Enviamos um link de confirmação para <strong className="text-paper">{email}</strong>. Depois de confirmar, é só entrar.
              </p>
              <Link href="/entrar" className="mt-6 inline-block text-sm text-lime underline underline-offset-4 decoration-lime/50 hover:decoration-lime">
                Ir para o login
              </Link>
            </div>
          ) : (
            <>
              <p className="label mb-4">{mode === "entrar" ? "Bem-vindo de volta" : "Comece agora · grátis"}</p>
              <h1 className="display text-5xl">
                {mode === "entrar" ? (
                  <>
                    Entre no <span className="accent-serif text-lime">lab</span>
                  </>
                ) : (
                  <>
                    Crie sua <span className="accent-serif text-lime">conta</span>
                  </>
                )}
              </h1>

              <form onSubmit={submit} className="mt-10 space-y-4" noValidate>
                {mode === "cadastro" && (
                  <div>
                    <label htmlFor="name" className="mb-2 block text-sm text-fog">
                      Nome
                    </label>
                    <input id="name" className="field" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como quer ser chamado" />
                  </div>
                )}
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm text-fog">
                    E-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="field"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@estudio.com"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="mb-2 block text-sm text-fog">
                    Senha
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={show ? "text" : "password"}
                      className="field pr-12"
                      autoComplete={mode === "entrar" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo de 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => !s)}
                      aria-label={show ? "Ocultar senha" : "Mostrar senha"}
                      className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-fog hover:text-paper"
                    >
                      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p role="alert" className="rounded-xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm text-[#ffd5cb]">
                    {error}
                  </p>
                )}

                <Button type="submit" size="lg" className="w-full" loading={loading}>
                  {mode === "entrar" ? "Entrar" : "Criar conta e começar"}
                  {!loading && <ArrowRight className="size-4" />}
                </Button>
              </form>

              <p className="mt-6 text-center text-sm text-fog">
                {mode === "entrar" ? (
                  <>
                    Ainda não tem conta?{" "}
                    <Link href={`/cadastro${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-lime underline underline-offset-4 decoration-lime/50 hover:decoration-lime">
                      Cadastre-se
                    </Link>
                  </>
                ) : (
                  <>
                    Já tem conta?{" "}
                    <Link href="/entrar" className="text-lime underline underline-offset-4 decoration-lime/50 hover:decoration-lime">
                      Entrar
                    </Link>
                  </>
                )}
              </p>

              {backend.mode === "local" && (
                <p className="mt-10 rounded-xl border border-line px-4 py-3 text-xs leading-relaxed text-mute">
                  <strong className="text-fog">Modo local:</strong> sua conta e seus dados ficam salvos neste navegador. Configure o Supabase
                  (veja o README) para sincronizar entre dispositivos.
                </p>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
