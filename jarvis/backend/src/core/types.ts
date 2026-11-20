/**
 * JARVIS — contrato compartilhado entre módulos (dono: PROJECT MANAGER).
 * Agentes NÃO alteram este arquivo; pedem mudança no relatório de entrega.
 */

export type Role = "user" | "assistant" | "tool" | "system";

export interface Message {
  id: string;
  conversationId: string;
  role: Role;
  content: string;
  createdAt: string; // ISO
  meta?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export type MemoryKind = "fact" | "preference" | "summary";
export interface Memory {
  id: string;
  userId: string;
  kind: MemoryKind;
  content: string;
  createdAt: string;
}

export type TaskStatus = "open" | "done";
export interface JarvisTask {
  id: string;
  userId: string;
  title: string;
  notes?: string;
  dueAt?: string; // ISO; o app agenda notificação local
  status: TaskStatus;
  createdAt: string;
}

export interface UsageRecord {
  id: string;
  userId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  userId: string;
  actor: string; // "orchestrator" | nome do agente/ferramenta
  action: string;
  status: "ok" | "denied" | "error" | "pending_confirmation";
  detail?: Record<string, unknown>;
  createdAt: string;
}

export interface Device {
  userId: string;
  apnsToken: string;
  platform: "ios";
  createdAt: string;
}

export interface IntegrationToken {
  userId: string;
  provider: "google";
  /** Sempre cifrado em repouso (AES-256-GCM, chave JARVIS_ENCRYPTION_KEY). */
  encrypted: string;
  scopes: string[];
  updatedAt: string;
}

/** Persistência. Duas implementações: memória (testes/dev) e Postgres (Supabase). */
export interface Repos {
  conversations: {
    create(userId: string, title: string): Promise<Conversation>;
    get(userId: string, id: string): Promise<Conversation | null>;
    list(userId: string, limit?: number): Promise<Conversation[]>;
    touch(id: string): Promise<void>;
  };
  messages: {
    add(m: Omit<Message, "id" | "createdAt">): Promise<Message>;
    list(conversationId: string, limit?: number): Promise<Message[]>;
  };
  memories: {
    add(userId: string, kind: MemoryKind, content: string): Promise<Memory>;
    list(userId: string, limit?: number): Promise<Memory[]>;
    search(userId: string, query: string, limit?: number): Promise<Memory[]>;
    remove(userId: string, id: string): Promise<boolean>;
  };
  tasks: {
    add(t: Omit<JarvisTask, "id" | "createdAt" | "status">): Promise<JarvisTask>;
    list(userId: string, status?: TaskStatus): Promise<JarvisTask[]>;
    update(userId: string, id: string, patch: Partial<Pick<JarvisTask, "title" | "notes" | "dueAt" | "status">>): Promise<JarvisTask | null>;
  };
  usage: {
    add(u: Omit<UsageRecord, "id" | "createdAt">): Promise<UsageRecord>;
    /** Soma de custo (USD) do usuário desde `sinceIso`. */
    costSince(userId: string, sinceIso: string): Promise<number>;
    summary(userId: string, sinceIso: string): Promise<{ provider: string; model: string; calls: number; inputTokens: number; outputTokens: number; costUsd: number }[]>;
  };
  audit: {
    add(e: Omit<AuditEvent, "id" | "createdAt">): Promise<AuditEvent>;
    list(userId: string, limit?: number): Promise<AuditEvent[]>;
  };
  devices: {
    upsert(d: Omit<Device, "createdAt">): Promise<Device>;
    list(userId: string): Promise<Device[]>;
  };
  integrations: {
    get(userId: string, provider: "google"): Promise<IntegrationToken | null>;
    put(t: Omit<IntegrationToken, "updatedAt">): Promise<void>;
    remove(userId: string, provider: "google"): Promise<void>;
  };
}

/* ---------------- IA ---------------- */

export interface ToolContext {
  userId: string;
  conversationId: string;
  repos: Repos;
  /** Ações com efeito externo (enviar e-mail, criar evento) exigem confirmação explícita. */
  confirmed: boolean;
}

export interface ToolResult {
  ok: boolean;
  /** Texto curto devolvido ao modelo. */
  output: string;
  /** Quando a ação precisa de confirmação do usuário antes de executar. */
  needsConfirmation?: { summary: string };
  data?: unknown;
}

export interface Tool {
  name: string; // snake_case
  description: string;
  inputSchema: Record<string, unknown>; // JSON Schema (object)
  /** true = efeito externo; só executa com ctx.confirmed. */
  sideEffect: boolean;
  run(input: unknown, ctx: ToolContext): Promise<ToolResult>;
}

/** Registro de ferramentas — integrações registram as suas aqui. */
export interface ToolRegistry {
  register(tool: Tool): void;
  list(): Tool[];
  get(name: string): Tool | undefined;
}

export type ChatMode = "auto" | "fast" | "deep";

export interface ChatRequest {
  conversationId?: string;
  message: string;
  mode?: ChatMode;
  /** Usuário confirmou a ação pendente da última resposta. */
  confirm?: boolean;
}

export interface ToolCallSummary {
  name: string;
  status: "ok" | "error" | "denied" | "pending_confirmation";
}

export interface ChatResponse {
  conversationId: string;
  reply: string;
  provider: string; // "none" quando nenhum provedor está configurado
  model: string;
  toolCalls: ToolCallSummary[];
  pendingConfirmation?: { summary: string };
  usage: { inputTokens: number; outputTokens: number; costUsd: number };
}

export interface OrchestratorInput {
  userId: string;
  conversationId: string;
  history: Message[]; // já recortado pelo servidor (últimas N)
  message: string;
  mode: ChatMode;
  confirm: boolean;
}

export type OrchestratorResult = Omit<ChatResponse, "conversationId"> & {
  /** Ação aguardando confirmação; o servidor grava em meta.pending da mensagem do assistente (não vai ao cliente). */
  pendingAction?: { tool: string; input: unknown };
};

export interface Orchestrator {
  handle(input: OrchestratorInput): Promise<OrchestratorResult>;
  /** Provedores efetivamente configurados (com credencial). */
  providers(): { id: string; models: string[] }[];
}

export class BudgetExceededError extends Error {
  constructor(public readonly spentUsd: number, public readonly limitUsd: number) {
    super(`Orçamento diário de IA atingido (${spentUsd.toFixed(4)} / ${limitUsd} USD)`);
  }
}

/** Todos os provedores configurados falharam (servidor → 502 provider_unavailable). */
export class ProvidersFailedError extends Error {
  constructor(public readonly causes: string[]) {
    super(`Nenhum provedor respondeu: ${causes.join(" | ")}`);
  }
}
