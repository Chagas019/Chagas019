"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Radar } from "lucide-react";
import { Button, Input, ErrorBox } from "@/components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    setLoading(false);
    if (!r.ok) return setError((await r.json().catch(() => ({}))).error ?? "Falha no login");
    window.location.href = "/";
  }

  return (
    <div className="grid-bg flex min-h-screen items-center justify-center px-4">
      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm rounded-2xl bg-ink-900 p-8 shadow-card">
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-electric-400 to-electric-600 shadow-glow"><Radar className="h-5 w-5 text-white" /></div>
          <div>
            <p className="text-lg font-semibold tracking-tight text-white">OFERTA <span className="text-electric-400">AI</span></p>
            <p className="text-xs text-zinc-500">Acesso administrativo</p>
          </div>
        </div>
        <ErrorBox error={error} />
        <label className="mb-1.5 block text-xs text-zinc-400">E-mail</label>
        <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label className="mb-1.5 mt-4 block text-xs text-zinc-400">Senha</label>
        <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Button variant="primary" loading={loading} className="mt-6 h-10 w-full">Entrar</Button>
      </motion.form>
    </div>
  );
}
