import "server-only";

type Mail = { to: string; subject: string; text: string };

/**
 * Envio de e-mail transacional. Usa Resend quando RESEND_API_KEY existir.
 * Sem provedor: em desenvolvimento o conteúdo vai para o log do servidor;
 * em produção o envio falha de forma explícita (nunca fingimos que enviou).
 */
export async function sendMail(mail: Mail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "FRAME <no-reply@frame.local>";
  if (key) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: mail.to, subject: mail.subject, text: mail.text }),
    });
    if (!res.ok) throw new Error(`Falha ao enviar e-mail (${res.status})`);
    return;
  }
  if (process.env.NODE_ENV === "production" && process.env.FRAME_ALLOW_LOG_MAIL !== "1") {
    throw new Error("Nenhum provedor de e-mail configurado (RESEND_API_KEY).");
  }
  console.info(`[frame:mail] para=${mail.to} assunto="${mail.subject}"\n${mail.text}`);
}
