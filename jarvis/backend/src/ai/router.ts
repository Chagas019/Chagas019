import { ProvidersFailedError } from "../core/types.js";
import type { ChatMode } from "../core/types.js";
import { ProviderError, type LlmProvider, type LlmRequest, type LlmResponse } from "./providers/types.js";

export type Tier = "fast" | "balanced" | "deep";
export interface Candidate {
  provider: string;
  model: string;
}

const ANTHROPIC_DEFAULTS: Record<Tier, string> = {
  fast: "anthropic:claude-haiku-5-5",
  balanced: "anthropic:claude-sonnet-5-5",
  deep: "anthropic:claude-opus-5-5",
};
const GATEWAY_DEFAULTS: Record<Tier, string> = {
  fast: "gateway:anthropic/claude-haiku-5.5",
  balanced: "gateway:anthropic/claude-sonnet-5.5",
  deep: "gateway:anthropic/claude-opus-5.5",
};

/** "provedor:modelo" (o modelo pode conter ":" ou "/"). */
export function parseSpec(spec: string): Candidate | null {
  const i = spec.indexOf(":");
  if (i <= 0 || i === spec.length - 1) return null;
  return { provider: spec.slice(0, i).trim().toLowerCase(), model: spec.slice(i + 1).trim() };
}

const DEEP_RE = /\b(planej\w*|plano|an[aá]lis\w*|analis\w*|estrat[eé]gi\w*|arquitetur\w*|refator\w*|c[oó]digo|implement\w*|compar\w*|detalhad\w*|passo a passo|roadmap|diagnostic\w*|otimiz\w*)\b/i;

/** Heurística determinística (sem IA). */
export function classifyTier(message: string, mode: ChatMode): Tier {
  if (mode === "fast") return "fast";
  if (mode === "deep") return "deep";
  const text = message.trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  const hasCode = /```/.test(text);
  if (text.length > 800 || (hasCode && text.length > 200) || (DEEP_RE.test(text) && words >= 8)) return "deep";
  if (text.length <= 80 && words <= 14 && !DEEP_RE.test(text)) return "fast";
  return "balanced";
}

export class ProviderUnavailableError extends ProvidersFailedError {}

export class Router {
  private readonly byId: Map<string, LlmProvider>;
  private readonly tiers: Record<Tier, string>;
  private readonly chain: Candidate[];

  constructor(providers: LlmProvider[], env: NodeJS.ProcessEnv) {
    this.byId = new Map(providers.map((p) => [p.id, p]));
    const defaults = this.byId.has("anthropic") || !this.byId.has("gateway") ? ANTHROPIC_DEFAULTS : GATEWAY_DEFAULTS;
    this.tiers = {
      fast: env.JARVIS_MODEL_FAST?.trim() || defaults.fast,
      balanced: env.JARVIS_MODEL_BALANCED?.trim() || defaults.balanced,
      deep: env.JARVIS_MODEL_DEEP?.trim() || defaults.deep,
    };
    this.chain = (env.JARVIS_FALLBACK_CHAIN ?? "")
      .split(",")
      .map((s) => parseSpec(s.trim()))
      .filter((c): c is Candidate => c !== null);
  }

  /** Candidatos em ordem (principal do tier + cadeia), só provedores configurados. */
  candidates(tier: Tier): Candidate[] {
    const primary = parseSpec(this.tiers[tier]);
    const all = [...(primary ? [primary] : []), ...this.chain].filter((c) => this.byId.has(c.provider));
    const seen = new Set<string>();
    return all.filter((c) => {
      const key = `${c.provider}:${c.model}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /** Modelos conhecidos por provedor configurado. */
  providers(): { id: string; models: string[] }[] {
    const models = new Map<string, Set<string>>([...this.byId.keys()].map((id) => [id, new Set<string>()]));
    for (const t of ["fast", "balanced", "deep"] as Tier[]) for (const c of this.candidates(t)) models.get(c.provider)?.add(c.model);
    return [...models].map(([id, set]) => ({ id, models: [...set] }));
  }

  hasCandidates(): boolean {
    return this.candidates("balanced").length > 0 || this.candidates("fast").length > 0 || this.candidates("deep").length > 0;
  }

  /** Tenta cada candidato; qualquer falha passa ao próximo (auth nunca repete no mesmo provedor). */
  async chat(tier: Tier, req: Omit<LlmRequest, "model">): Promise<{ response: LlmResponse; provider: string; model: string }> {
    const cands = this.candidates(tier);
    if (!cands.length) throw new ProviderUnavailableError(["nenhum provedor/modelo configurado"]);
    const causes: string[] = [];
    const authFailed = new Set<string>();
    for (const c of cands) {
      if (authFailed.has(c.provider)) continue;
      try {
        const response = await this.byId.get(c.provider)!.chat({ ...req, model: c.model });
        return { response, provider: c.provider, model: c.model };
      } catch (err) {
        const pe = err instanceof ProviderError ? err : new ProviderError((err as Error).message, "retryable");
        if (pe.kind === "auth") authFailed.add(c.provider);
        causes.push(`${c.provider}:${c.model} [${pe.kind}] ${pe.message}`);
      }
    }
    throw new ProviderUnavailableError(causes);
  }
}
