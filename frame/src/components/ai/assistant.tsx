"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo, useState } from "react";
import { Send, Sparkles, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type Tool = { slug: string; label: string; hint: string };

export function Assistant({ tools, quota }: { tools: Tool[]; quota: { used: number; limit: number } }) {
  const [tool, setTool] = useState(tools[0]!.slug);
  const [input, setInput] = useState("");
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/ai/chat", body: () => ({ tool }) }), [tool]);
  const { messages, sendMessage, status, error, setMessages, stop } = useChat({ transport });
  const busy = status === "submitted" || status === "streaming";
  const current = tools.find((t) => t.slug === tool)!;
  let errorText: string | null = null;
  if (error) {
    try {
      errorText = JSON.parse(error.message).error ?? error.message;
    } catch {
      errorText = error.message || "Não foi possível responder agora.";
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <nav aria-label="Ferramentas" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
        {tools.map((t) => (
          <button
            key={t.slug}
            onClick={() => {
              setTool(t.slug);
              setMessages([]);
            }}
            aria-pressed={tool === t.slug}
            className={cn("shrink-0 rounded-[var(--radius-sm)] px-4 py-2.5 text-left text-sm transition", tool === t.slug ? "bg-paper text-ink-950" : "bg-ink-850 text-fog-300 hover:text-paper")}
          >
            {t.label}
          </button>
        ))}
        <p className="hidden pt-3 text-xs text-fog-500 lg:block">
          Uso hoje: {quota.used}/{quota.limit}. A IA sugere; a autoria é sua.
        </p>
      </nav>
      <div className="flex min-h-[60vh] flex-col rounded-[var(--radius-lg)] bg-ink-850">
        <div aria-live="polite" className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center py-12 text-center">
              <Sparkles className="mb-4 size-8 text-volt-300" aria-hidden />
              <p className="font-display text-3xl">{current.label}</p>
              <p className="mt-2 max-w-md text-sm text-fog-500">{current.hint}</p>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={cn("max-w-[90%] whitespace-pre-wrap text-[15px] leading-relaxed", m.role === "user" ? "ml-auto rounded-2xl bg-ink-750 px-4 py-3 text-paper" : "text-fog-200")}>
                {m.parts.map((p, i) => (p.type === "text" ? <span key={i}>{p.text}</span> : null))}
              </div>
            ))
          )}
          {errorText ? <p role="alert" className="rounded-[var(--radius-sm)] bg-danger-500/10 px-4 py-3 text-sm text-danger-400">{errorText}</p> : null}
        </div>
        <form
          className="flex items-end gap-2 border-t border-ink-700 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim() || busy) return;
            sendMessage({ text: input });
            setInput("");
          }}
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={current.hint}
            aria-label="Mensagem para o FRAME AI"
            rows={2}
            maxLength={2000}
            className="min-h-12 flex-1 resize-none"
          />
          {messages.length ? (
            <Button type="button" variant="ghost" size="icon" aria-label="Nova conversa" onClick={() => (busy ? stop() : setMessages([]))}>
              <RotateCcw className="size-4" />
            </Button>
          ) : null}
          <Button type="submit" size="icon" aria-label="Enviar" loading={busy} disabled={!input.trim()}>
            {busy ? null : <Send className="size-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
