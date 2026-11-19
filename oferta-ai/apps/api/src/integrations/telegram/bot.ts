/**
 * Telegram Bot API (oficial) — canal alternativo compatível.
 * O bot precisa ser administrador do canal/grupo de destino.
 */
export class TelegramApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}

export class TelegramBotClient {
  constructor(private readonly token: string, private readonly fetchImpl: typeof fetch = fetch) {
    if (!token) throw new Error("Telegram: botToken obrigatório");
  }

  private async call<T>(method: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await this.fetchImpl(`https://api.telegram.org/bot${this.token}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
        signal: AbortSignal.timeout(20_000),
      });
    } catch (err) {
      throw new TelegramApiError(`Falha de conexão com Telegram: ${(err as Error).message}`, 0);
    }
    const json = (await res.json().catch(() => ({}))) as { ok: boolean; result: T; description?: string };
    if (!json.ok) throw new TelegramApiError(`Telegram: ${json.description ?? `HTTP ${res.status}`}`, res.status);
    return json.result;
  }

  getMe() {
    return this.call<{ id: number; username: string }>("getMe");
  }

  getChat(chatId: string) {
    return this.call<{ id: number; title?: string; type: string }>("getChat", { chat_id: chatId });
  }

  async getMyStatus(chatId: string, botId: number) {
    return this.call<{ status: string; can_post_messages?: boolean }>("getChatMember", { chat_id: chatId, user_id: botId });
  }

  async sendMessage(chatId: string, text: string) {
    const r = await this.call<{ message_id: number }>("sendMessage", { chat_id: chatId, text, disable_web_page_preview: false });
    return { messageId: String(r.message_id) };
  }
}
