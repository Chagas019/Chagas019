/**
 * WhatsApp Business Platform — Cloud API (oficial Meta) + Groups API.
 *
 * Restrições confirmadas na documentação da Meta (developers.facebook.com/documentation/business-messaging/whatsapp/groups):
 *  - Groups API exige que a empresa seja Official Business Account (OBA) — verificação de empresa NÃO basta.
 *  - Só funciona com números na Cloud API (não no app WhatsApp Business).
 *  - A API só publica em grupos CRIADOS PELA PRÓPRIA API (via POST /{phone-number-id}/groups).
 *    Grupos já existentes criados no app (ex.: convite chat.whatsapp.com/...) NÃO podem ser alvo.
 *  - Participantes entram pelo link de convite (não há endpoint para adicionar membros) e há limite
 *    reduzido de participantes por grupo — confirme o valor atual na documentação.
 * Esta classe NÃO usa WhatsApp Web nem qualquer automação não oficial.
 */
export class WhatsAppApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly code?: number, public readonly details?: unknown) {
    super(message);
  }
  get isPermission() {
    return this.status === 403 || this.code === 10 || this.code === 200 || this.code === 190;
  }
}

export class WhatsAppCloudClient {
  private base: string;
  constructor(
    private readonly token: string,
    private readonly phoneNumberId: string,
    graphVersion = "v23.0",
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    if (!token || !phoneNumberId) throw new Error("WhatsApp: token e phoneNumberId são obrigatórios");
    this.base = `https://graph.facebook.com/${graphVersion}`;
  }

  private async call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.base}${path}`, {
        method,
        headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(20_000),
      });
    } catch (err) {
      throw new WhatsAppApiError(`Falha de conexão com a Graph API: ${(err as Error).message}`, 0);
    }
    const json = (await res.json().catch(() => ({}))) as { error?: { message: string; code?: number } } & T;
    if (!res.ok || json.error) {
      throw new WhatsAppApiError(`WhatsApp API: ${json.error?.message ?? `HTTP ${res.status}`}`, res.status, json.error?.code, json.error);
    }
    return json;
  }

  /** Confirma token + número (nome verificado, qualidade). */
  phoneInfo() {
    return this.call<{ id: string; display_phone_number?: string; verified_name?: string; quality_rating?: string }>(
      "GET",
      `/${this.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`,
    );
  }

  /** Lê dados do grupo (falha se o grupo não pertence a este número/API). */
  groupInfo(groupId: string) {
    return this.call<Record<string, unknown>>("GET", `/${groupId}?fields=subject,description,total_participant_count`);
  }

  /** Cria um grupo pela Groups API (necessário para publicação oficial em grupo). */
  createGroup(subject: string, description?: string) {
    return this.call<{ id?: string; request_id?: string }>("POST", `/${this.phoneNumberId}/groups`, {
      messaging_product: "whatsapp",
      subject,
      description,
    });
  }

  getInviteLink(groupId: string) {
    return this.call<{ invite_link?: string }>("GET", `/${groupId}/invite_link`);
  }

  /** Envio de texto para um grupo (recipient_type=group). */
  async sendGroupText(groupId: string, body: string) {
    const r = await this.call<{ messages?: Array<{ id: string }> }>("POST", `/${this.phoneNumberId}/messages`, {
      messaging_product: "whatsapp",
      recipient_type: "group",
      to: groupId,
      type: "text",
      text: { preview_url: true, body },
    });
    return { messageId: r.messages?.[0]?.id ?? null };
  }
}
