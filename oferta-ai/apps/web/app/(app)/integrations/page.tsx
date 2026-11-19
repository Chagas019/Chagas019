"use client";
import { useState } from "react";
import { api, usePoll, fmtDate } from "@/lib/api";
import { Card, PageHeader, Loading, ErrorBox, Button, Input, StateBadge, Badge } from "@/components/ui";

const META: Record<string, { title: string; creds: [string, string][]; config: [string, string][]; docs: string; need: string[] }> = {
  SHOPEE_AFFILIATE: {
    title: "Shopee Affiliate Open API",
    creds: [["appId", "App ID"], ["appSecret", "App Secret"]],
    config: [["apiUrl", "Endpoint GraphQL"], ["subId", "Sub ID (rastreio)"]],
    docs: "https://affiliate.shopee.com.br/open_api",
    need: ["Conta aprovada no Programa de Afiliados Shopee Brasil", "Acesso à Open API liberado (App ID + Secret em affiliate.shopee.com.br → Open API)", "Clicar em Verificar: executa uma consulta real productOfferV2"],
  },
  WHATSAPP_CLOUD: {
    title: "WhatsApp Business Platform (Cloud API · Groups API)",
    creds: [["token", "Access token (System User)"]],
    config: [["phoneNumberId", "Phone Number ID"], ["groupId", "Group ID (criado pela API)"], ["graphVersion", "Versão Graph API"]],
    docs: "https://developers.facebook.com/documentation/business-messaging/whatsapp/groups/",
    need: ["Número na Cloud API (não no app WhatsApp Business)", "Empresa com status Official Business Account (OBA) — exigido pela Groups API", "Token com permissão whatsapp_business_messaging", "Grupo CRIADO PELA API (botão abaixo); grupos existentes do app não podem ser usados", "Consentimento dos participantes"],
  },
  TELEGRAM_BOT: {
    title: "Telegram Bot API (canal alternativo oficial)",
    creds: [["botToken", "Bot token (@BotFather)"]],
    config: [["chatId", "Chat ID do canal/grupo"]],
    docs: "https://core.telegram.org/bots/api",
    need: ["Criar bot no @BotFather", "Adicionar o bot como administrador do canal/grupo", "Informar o chat ID (ex.: -100…)"],
  },
  ANTHROPIC: {
    title: "IA dos agentes (Claude API)",
    creds: [["apiKey", "API key"]],
    config: [["model", "Modelo principal"], ["fallbackModels", "Modelos de fallback (vírgula)"]],
    docs: "https://platform.claude.com",
    need: ["Opcional: sem chave, o Copywriter usa template determinístico com dados reais"],
  },
};

function IntegrationCard({ it, onChange }: { it: any; onChange: () => void }) {
  const m = META[it.provider];
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [config, setConfig] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [group, setGroup] = useState({ subject: "OFERTA AI — Ofertas", description: "Ofertas selecionadas. Links de afiliado." });

  async function run(label: string, fn: () => Promise<any>) {
    setBusy(label); setResult(null);
    try { const r = await fn(); setResult(r?.ok === false ? `Falhou: ${r.error}` : label === "verify" ? "Verificação OK ✓" : r?.inviteLink ? `Grupo criado. Convite: ${r.inviteLink}` : "Salvo ✓"); onChange(); }
    catch (e: any) { setResult(`Erro: ${e.message}`); } finally { setBusy(""); }
  }

  return (
    <Card title={m.title} action={<StateBadge state={it.status} />}>
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium text-zinc-300">O que é necessário para ativar</p>
          <ul className="mb-3 list-disc space-y-1 pl-4 text-xs text-zinc-400">{m.need.map((n) => <li key={n}>{n}</li>)}</ul>
          {it.missing.length > 0 && <p className="mb-2 text-xs text-amber-300">Falta: {it.missing.join(", ")}</p>}
          <p className="text-[11px] text-zinc-500">Última verificação: {fmtDate(it.lastVerifiedAt)}</p>
          {it.lastError && <p className="mt-1 break-words text-[11px] text-red-400">{it.lastError}</p>}
          <a href={m.docs} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-electric-400 hover:underline">Documentação oficial ↗</a>
        </div>
        <div className="space-y-2.5">
          {m.creds.map(([k, l]) => (
            <label key={k} className="block"><span className="mb-1 block text-[11px] text-zinc-500">{l} {it.credentials[k] && <span className="font-mono text-zinc-600">({it.credentials[k]})</span>}</span>
              <Input type="password" autoComplete="off" placeholder={it.credentials[k] ? "manter atual" : ""} value={creds[k] ?? ""} onChange={(e) => setCreds({ ...creds, [k]: e.target.value })} /></label>
          ))}
          {m.config.map(([k, l]) => (
            <label key={k} className="block"><span className="mb-1 block text-[11px] text-zinc-500">{l}</span>
              <Input value={config[k] ?? it.config[k] ?? ""} onChange={(e) => setConfig({ ...config, [k]: e.target.value })} /></label>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button loading={busy === "save"} onClick={() => run("save", () => api(`integrations/${it.provider}`, { method: "PUT", body: { credentials: creds, config } }))}>Salvar</Button>
            <Button variant="primary" loading={busy === "verify"} onClick={() => run("verify", () => api(`integrations/${it.provider}/verify`, { method: "POST" }))}>Verificar conexão</Button>
          </div>
          {(it.provider === "WHATSAPP_CLOUD" || it.provider === "TELEGRAM_BOT") && (
            <label className="mt-2 flex items-start gap-2 text-xs text-zinc-300">
              <input type="checkbox" className="mt-0.5" checked={it.consentConfirmed} onChange={(e) => run("consent", () => api(`integrations/${it.provider}/consent`, { method: "POST", body: { confirmed: e.target.checked } }))} />
              Confirmo que os participantes deste grupo/canal consentiram em receber ofertas com links de afiliado.
            </label>
          )}
          {it.provider === "WHATSAPP_CLOUD" && (
            <div className="mt-3 rounded-lg bg-ink-850 p-3 ring-1 ring-white/[0.05]">
              <p className="mb-2 text-xs font-medium text-zinc-300">Criar grupo pela Groups API</p>
              <Input className="mb-2" value={group.subject} onChange={(e) => setGroup({ ...group, subject: e.target.value })} />
              <Input className="mb-2" value={group.description} onChange={(e) => setGroup({ ...group, description: e.target.value })} />
              <Button loading={busy === "group"} onClick={() => run("group", () => api("integrations/WHATSAPP_CLOUD/create-group", { method: "POST", body: group }))}>Criar grupo</Button>
            </div>
          )}
          {result && <p className="break-words text-xs text-electric-400">{result}</p>}
        </div>
      </div>
    </Card>
  );
}

export default function Integrations() {
  const { data, error, reload } = usePoll<any>("integrations", 0);
  if (!data) return error ? <ErrorBox error={error} /> : <Loading />;
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Integrações" subtitle="Credenciais são criptografadas (AES-256-GCM) no servidor e nunca retornam ao navegador." actions={data.mode === "sandbox" ? <Badge tone="amber">modo sandbox: integrações reais não são usadas para publicar</Badge> : undefined} />
      <Card className="mb-4">
        <p className="text-sm font-medium text-white">Sobre o grupo do WhatsApp informado (link de convite chat.whatsapp.com)</p>
        <p className="mt-2 text-xs leading-relaxed text-zinc-400">A API oficial da Meta só publica em grupos <b className="text-zinc-200">criados pela própria Groups API</b>, por empresas com status <b className="text-zinc-200">Official Business Account</b>. Um grupo existente criado no app do WhatsApp não pode receber mensagens automáticas por via oficial, e a OFERTA AI não usa automação de WhatsApp Web. Para esse grupo, use o <b className="text-zinc-200">canal “Compartilhamento manual”</b>: as ofertas entram na Central de publicações no horário programado, prontas para copiar/abrir no WhatsApp e confirmar. Alternativas automáticas oficiais: criar um grupo novo via Groups API (abaixo) ou usar um canal do Telegram.</p>
      </Card>
      <div className="space-y-4">{data.items.map((it: any) => <IntegrationCard key={it.provider} it={it} onChange={reload} />)}</div>
    </div>
  );
}
