import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type Mail = { to: string; subject: string; text: string; html?: string };

/** Qual provedor está configurado (nunca expõe credenciais). */
export function mailProvider(): "resend" | "smtp" | "sink" | null {
  if (process.env.RESEND_API_KEY) return "resend";
  if (smtpConfig()) return "smtp";
  if (process.env.FRAME_MAIL_FILE_SINK && process.env.VERCEL_ENV !== "production") return "sink";
  return null;
}

/**
 * SMTP genérico. Atalho para Gmail: GMAIL_USER + GMAIL_APP_PASSWORD (senha de app de 16 letras,
 * criada em myaccount.google.com/apppasswords — nunca a senha normal da conta).
 */
function smtpConfig() {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return { host: "smtp.gmail.com", port: 465, secure: true, user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, "") };
  }
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    return { host: process.env.SMTP_HOST, port, secure: port === 465, user: process.env.SMTP_USER, pass: process.env.SMTP_PASS };
  }
  return null;
}

function fromAddress() {
  if (process.env.MAIL_FROM) return process.env.MAIL_FROM;
  if (process.env.GMAIL_USER) return `FRAME <${process.env.GMAIL_USER}>`;
  return "FRAME <no-reply@frame.local>";
}

/**
 * Envio de e-mail transacional: Resend, SMTP (ex.: Gmail) ou, só em testes, arquivo local.
 * Sem provedor: em desenvolvimento o conteúdo vai para o log; em produção falha de forma
 * explícita (nunca fingimos que enviou).
 */
export async function sendMail(mail: Mail): Promise<void> {
  const provider = mailProvider();
  if (provider === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromAddress(), to: mail.to, subject: mail.subject, text: mail.text, html: mail.html }),
    });
    if (!res.ok) throw new Error(`Falha ao enviar e-mail (${res.status})`);
    return;
  }
  if (provider === "smtp") {
    const cfg = smtpConfig()!;
    const { createTransport } = await import("nodemailer");
    const transport = createTransport({ host: cfg.host, port: cfg.port, secure: cfg.secure, auth: { user: cfg.user, pass: cfg.pass } });
    await transport.sendMail({ from: fromAddress(), to: mail.to, subject: mail.subject, text: mail.text, html: mail.html });
    return;
  }
  if (provider === "sink") {
    // Testes automatizados: grava a mensagem para o teste "abrir a caixa de entrada".
    const dir = process.env.FRAME_MAIL_FILE_SINK!;
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${Date.now()}-${Math.random().toString(36).slice(2)}.json`), JSON.stringify(mail));
    return;
  }
  if (process.env.NODE_ENV === "production" && process.env.FRAME_ALLOW_LOG_MAIL !== "1") {
    throw new Error("Nenhum provedor de e-mail configurado.");
  }
  console.info(`[frame:mail] para=${mail.to} assunto="${mail.subject}"\n${mail.text}`);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** E-mail do link de acesso: preto e limão, botão grande, funciona em qualquer cliente de e-mail. */
export function accessLinkEmail(url: string, isNew: boolean) {
  const title = isNew ? "Seu acesso à FRAME" : "Seu link para entrar na FRAME";
  const lead = isNew ? "Toque no botão para criar sua conta e entrar na FRAME." : "Toque no botão para entrar na sua conta.";
  const text = `${title}\n\n${lead}\n\n${url}\n\nO link vale por 15 minutos e só funciona uma vez. Se você não pediu, ignore este e-mail — ninguém entra na sua conta sem ele.`;
  const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#080908;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#f5f5f0">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">
    <table role="presentation" width="100%" style="max-width:480px;background:#121311;border-radius:24px;padding:32px" cellspacing="0" cellpadding="0">
      <tr><td style="font-size:13px;letter-spacing:4px;font-weight:bold;color:#f5f5f0">▣ FRAME</td></tr>
      <tr><td style="padding-top:24px;font-size:26px;font-weight:bold;line-height:1.2">${esc(title)}</td></tr>
      <tr><td style="padding-top:12px;font-size:16px;line-height:1.5;color:#c0c2b8">${esc(lead)}</td></tr>
      <tr><td style="padding-top:28px"><a href="${esc(url)}" style="display:inline-block;background:#d4ff36;color:#080908;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 28px;border-radius:999px">Entrar na FRAME</a></td></tr>
      <tr><td style="padding-top:28px;font-size:13px;line-height:1.5;color:#85877f">O link vale por 15 minutos e só funciona uma vez. Se você não pediu, ignore este e-mail — ninguém entra na sua conta sem ele.</td></tr>
      <tr><td style="padding-top:16px;font-size:12px;line-height:1.5;color:#5d5f58;word-break:break-all">Se o botão não funcionar, copie: ${esc(url)}</td></tr>
    </table>
  </td></tr></table></body></html>`;
  return { subject: title, text, html };
}
