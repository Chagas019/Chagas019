"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { Button, Notice, inputCls } from "@/components/ui/primitives";

import { safeRedirectPath as safeBack } from "@/lib/redirect";

export function LoginForm() {
  const sb = getBrowserSupabase();
  const router = useRouter();
  const params = useSearchParams();
  const back = safeBack(params.get("voltar"));
  const [mode, setMode] = useState<"entrar" | "criar" | "recuperar">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ tone: "info" | "warn"; text: string } | null>(params.get("erro") ? { tone: "warn", text: "O link de confirmação é inválido ou expirou. Tente novamente." } : null);

  if (!sb) {
    return (
      <div className="w-full max-w-md space-y-4">
        <Notice tone="warn" title="Login indisponível neste servidor">O Supabase ainda não foi configurado. Você pode usar toda a plataforma: seus itens ficam salvos neste navegador.</Notice>
        <Link href={back} className="block text-center text-sm font-semibold text-royal-700 hover:underline">Continuar sem conta</Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!sb) return;
    setLoading(true); setMsg(null);
    const redirect = `${location.origin}/auth/callback?voltar=${encodeURIComponent(back)}`;
    try {
      if (mode === "entrar") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(back); router.refresh();
      } else if (mode === "criar") {
        const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: redirect, data: { display_name: name } } });
        if (error) throw error;
        if (data.session) { router.replace(back); router.refresh(); }
        else setMsg({ tone: "info", text: "Conta criada! Enviamos um e-mail de confirmação. Abra o link para entrar." });
      } else {
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/callback?voltar=/configuracoes` });
        if (error) throw error;
        setMsg({ tone: "info", text: "Se houver uma conta com este e-mail, você receberá um link para redefinir a senha." });
      }
    } catch (err) {
      const m = (err as Error).message;
      setMsg({ tone: "warn", text: /Invalid login/i.test(m) ? "E-mail ou senha incorretos." : /already registered/i.test(m) ? "Este e-mail já tem conta. Use “Entrar”." : m });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-ivory-300/70 bg-white p-8 shadow-lift">
      <h1 className="font-serif text-2xl text-royal-900">{mode === "entrar" ? "Entrar" : mode === "criar" ? "Criar conta" : "Recuperar senha"}</h1>
      <p className="mt-1 text-sm text-ink-soft">{mode === "criar" ? "Grátis. Guarde pregações, referências e anotações com segurança." : "Bem-vindo de volta ao VERBUM."}</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "criar" && <div><label htmlFor="nome" className="mb-1 block text-sm font-semibold text-royal-900">Nome</label><input id="nome" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" /></div>}
        <div><label htmlFor="email" className="mb-1 block text-sm font-semibold text-royal-900">E-mail</label><input id="email" type="email" required className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
        {mode !== "recuperar" && <div><label htmlFor="senha" className="mb-1 block text-sm font-semibold text-royal-900">Senha</label><input id="senha" type="password" required minLength={8} className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "criar" ? "new-password" : "current-password"} />{mode === "criar" && <p className="mt-1 text-xs text-ink-mute">Mínimo de 8 caracteres.</p>}</div>}
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <Button type="submit" disabled={loading} className="w-full">{loading && <Loader2 className="h-4 w-4 animate-spin" />} {mode === "entrar" ? "Entrar" : mode === "criar" ? "Criar conta" : "Enviar link"}</Button>
      </form>
      <div className="mt-6 flex flex-col items-center gap-2 text-sm">
        {mode !== "entrar" && <button className="text-royal-700 hover:underline" onClick={() => setMode("entrar")}>Já tenho conta</button>}
        {mode !== "criar" && <button className="text-royal-700 hover:underline" onClick={() => setMode("criar")}>Criar uma conta</button>}
        {mode === "entrar" && <button className="text-ink-mute hover:underline" onClick={() => setMode("recuperar")}>Esqueci a senha</button>}
        <Link href={back} className="mt-2 text-ink-mute hover:underline">Continuar sem conta</Link>
      </div>
    </div>
  );
}
