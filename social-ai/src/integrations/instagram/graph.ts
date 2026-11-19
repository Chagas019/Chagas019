import { GraphApiError, IntegrationUnavailableError, PermanentError } from '../../lib/errors.js';

/**
 * Cliente da Instagram Graph API oficial (Instagram API com Login do Facebook).
 * Documentação: https://developers.facebook.com/docs/instagram-platform
 *
 * Permissões usadas:
 *  - instagram_basic, instagram_content_publish, instagram_manage_insights
 *  - pages_show_list, pages_read_engagement, business_management
 * Recurso opcional: "Instagram Public Content Access" (para Hashtag Search).
 */
export const REQUIRED_PERMISSIONS = ['instagram_basic', 'instagram_content_publish', 'instagram_manage_insights', 'pages_show_list'];
export const OPTIONAL_PERMISSIONS = ['pages_read_engagement', 'business_management'];

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface GraphClientOptions {
  accessToken: string;
  version?: string;
  host?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  /** Intervalo do polling de status de container. */
  pollIntervalMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export interface MediaContainerInput {
  media_type?: 'REELS' | 'CAROUSEL' | 'STORIES' | 'VIDEO' | 'IMAGE';
  image_url?: string;
  video_url?: string;
  caption?: string;
  is_carousel_item?: boolean;
  children?: string[];
  cover_url?: string;
  share_to_feed?: boolean;
}

export class GraphClient {
  private token: string;
  private base: string;
  private fetchImpl: FetchLike;
  private timeoutMs: number;
  private pollIntervalMs: number;
  private sleep: (ms: number) => Promise<void>;

  constructor(o: GraphClientOptions) {
    if (!o.accessToken) throw new IntegrationUnavailableError('instagram', 'Nenhum token de acesso configurado. Conecte a conta em Integrações.');
    this.token = o.accessToken;
    this.base = `${o.host ?? 'https://graph.facebook.com'}/${o.version ?? 'v24.0'}`;
    this.fetchImpl = o.fetchImpl ?? ((u, i) => fetch(u, i));
    this.timeoutMs = o.timeoutMs ?? 30_000;
    this.pollIntervalMs = o.pollIntervalMs ?? 5_000;
    this.sleep = o.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  async request<T = any>(method: 'GET' | 'POST' | 'DELETE', path: string, params: Record<string, unknown> = {}): Promise<T> {
    const url = new URL(`${this.base}/${path.replace(/^\//, '')}`);
    const body = new URLSearchParams();
    const target = method === 'GET' ? url.searchParams : body;
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      target.set(k, Array.isArray(v) ? v.join(',') : typeof v === 'object' ? JSON.stringify(v) : String(v));
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    let res: Response;
    try {
      res = await this.fetchImpl(url.toString(), {
        method,
        headers: { Authorization: `Bearer ${this.token}`, ...(method !== 'GET' ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}) },
        body: method === 'GET' ? undefined : body.toString(),
        signal: ctrl.signal,
      });
    } catch (e: any) {
      throw new GraphApiError(`Falha de rede na Graph API: ${e?.message ?? e}`, 503);
    } finally {
      clearTimeout(timer);
    }
    const text = await res.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new GraphApiError(`Resposta inválida da Graph API (${res.status})`, res.status);
    }
    if (!res.ok || data?.error) {
      const e = data?.error ?? {};
      throw new GraphApiError(e.error_user_msg || e.message || `HTTP ${res.status}`, res.status, e.code, e.error_subcode, e.type, e.fbtrace_id);
    }
    return data as T;
  }

  // ---------- Conta, permissões e elegibilidade ----------
  me() {
    return this.request('GET', 'me', { fields: 'id,name' });
  }
  permissions(): Promise<{ data: { permission: string; status: string }[] }> {
    return this.request('GET', 'me/permissions');
  }
  pagesWithInstagram(): Promise<{ data: any[] }> {
    return this.request('GET', 'me/accounts', { fields: 'id,name,instagram_business_account{id,username,name}' });
  }
  account(igUserId: string) {
    return this.request('GET', igUserId, {
      fields: 'id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website',
    });
  }
  publishingLimit(igUserId: string): Promise<{ data: { quota_usage: number; config?: { quota_total: number; quota_duration: number } }[] }> {
    return this.request('GET', `${igUserId}/content_publishing_limit`, { fields: 'config,quota_usage' });
  }
  ownMedia(igUserId: string, limit = 25) {
    return this.request<{ data: any[] }>('GET', `${igUserId}/media`, {
      fields: 'id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count',
      limit,
    });
  }

  // ---------- Pesquisa (fontes autorizadas) ----------
  /** Requer o recurso "Instagram Public Content Access". Limite: 30 hashtags únicas / 7 dias. */
  async hashtagId(igUserId: string, q: string): Promise<string | null> {
    const r = await this.request<{ data: { id: string }[] }>('GET', 'ig_hashtag_search', { user_id: igUserId, q });
    return r.data?.[0]?.id ?? null;
  }
  hashtagTopMedia(igUserId: string, hashtagId: string) {
    return this.request<{ data: any[] }>('GET', `${hashtagId}/top_media`, {
      user_id: igUserId,
      fields: 'id,media_type,media_product_type,caption,like_count,comments_count,permalink,timestamp',
      limit: 30,
    });
  }
  /** Business Discovery: métricas públicas de contas Business/Creator de referência. */
  businessDiscovery(igUserId: string, username: string) {
    const fields = `business_discovery.username(${username}){username,followers_count,media_count,media.limit(20){id,caption,media_type,media_product_type,like_count,comments_count,permalink,timestamp}}`;
    return this.request('GET', igUserId, { fields });
  }

  // ---------- Publicação de conteúdo ----------
  async createContainer(igUserId: string, input: MediaContainerInput): Promise<string> {
    const r = await this.request<{ id: string }>('POST', `${igUserId}/media`, input as Record<string, unknown>);
    if (!r.id) throw new GraphApiError('Container sem id', 500);
    return r.id;
  }

  containerStatus(containerId: string): Promise<{ status_code: string; status?: string }> {
    return this.request('GET', containerId, { fields: 'status_code,status' });
  }

  /** Aguarda o processamento (vídeos podem levar minutos). */
  async waitContainer(containerId: string, maxWaitMs = 10 * 60_000): Promise<void> {
    const deadline = Date.now() + maxWaitMs;
    for (;;) {
      const s = await this.containerStatus(containerId);
      if (s.status_code === 'FINISHED' || s.status_code === 'PUBLISHED') return;
      if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') {
        throw new PermanentError(`Container ${containerId} com status ${s.status_code}: ${s.status ?? ''}`);
      }
      if (Date.now() > deadline) throw new GraphApiError(`Tempo esgotado aguardando container ${containerId}`, 504);
      await this.sleep(this.pollIntervalMs);
    }
  }

  async publishContainer(igUserId: string, creationId: string): Promise<string> {
    const r = await this.request<{ id: string }>('POST', `${igUserId}/media_publish`, { creation_id: creationId });
    return r.id;
  }

  mediaInfo(mediaId: string) {
    return this.request<{ id: string; permalink?: string; timestamp?: string; media_type?: string; media_product_type?: string }>(
      'GET', mediaId, { fields: 'id,permalink,timestamp,media_type,media_product_type,like_count,comments_count' },
    );
  }

  // ---------- Insights ----------
  async mediaInsights(mediaId: string, metrics: string[]): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    const parse = (r: any) => {
      for (const m of r.data ?? []) {
        const v = m.values?.[0]?.value ?? m.total_value?.value;
        if (typeof v === 'number') out[m.name] = v;
      }
    };
    try {
      parse(await this.request('GET', `${mediaId}/insights`, { metric: metrics.join(',') }));
    } catch (e) {
      // Métricas variam por tipo de mídia/versão da API. Em erro de métrica, tenta uma a uma.
      if (!(e instanceof GraphApiError) || e.code !== 100) throw e;
      for (const m of metrics) {
        try {
          parse(await this.request('GET', `${mediaId}/insights`, { metric: m }));
        } catch (inner) {
          if (!(inner instanceof GraphApiError) || inner.code !== 100) throw inner;
        }
      }
    }
    return out;
  }

  async accountInsights(igUserId: string, metrics: string[], period = 'day'): Promise<Record<string, number>> {
    const out: Record<string, number> = {};
    for (const m of metrics) {
      try {
        const r: any = await this.request('GET', `${igUserId}/insights`, { metric: m, period, metric_type: 'total_value' });
        for (const d of r.data ?? []) {
          const v = d.total_value?.value ?? d.values?.at(-1)?.value;
          if (typeof v === 'number') out[d.name] = v;
        }
      } catch (e) {
        if (!(e instanceof GraphApiError) || e.code !== 100) throw e;
      }
    }
    return out;
  }
}

/** Métricas por tipo de mídia (impressions foi descontinuada em 2025 para mídias novas; usamos views). */
export function metricsFor(mediaType: string): string[] {
  switch (mediaType) {
    case 'REELS':
      return ['reach', 'views', 'likes', 'comments', 'shares', 'saved', 'total_interactions', 'ig_reels_avg_watch_time'];
    case 'STORIES':
      return ['reach', 'views', 'replies', 'shares', 'total_interactions', 'follows', 'profile_visits'];
    default:
      return ['reach', 'views', 'likes', 'comments', 'shares', 'saved', 'total_interactions', 'follows', 'profile_visits'];
  }
}
