// Espelho dos tipos/enums gerados pelo Floot (helpers/schema) usados pela lógica. O original é gerado do banco.
export type MbAction = "acompanhar" | "comparecer" | "ignorar" | "ler" | "pagar" | "responder" | "revisar";
export type MbAgent = "chat" | "summary" | "triage";
export type MbCategory = "compromissos" | "financeiro" | "informativos" | "pessoal" | "trabalho";
export type MbPriority = "baixa" | "importante" | "normal" | "spam" | "urgente";
export type MbReason = "cobranca" | "compromisso" | "contato_pessoal" | "informativo" | "outro" | "pedido_direto" | "prazo_proximo" | "promocional" | "remetente_ignorado" | "suspeito" | "trabalho" | "vip";
export type MbSource = "ai" | "cache" | "rules";
export type MbSyncKind = "full_resync" | "incremental" | "initial";
export const MbPriorityArrayValues: [MbPriority, ...MbPriority[]] = ["baixa","importante","normal","spam","urgente"];
export const MbCategoryArrayValues: [MbCategory, ...MbCategory[]] = ["compromissos","financeiro","informativos","pessoal","trabalho"];
export const MbActionArrayValues: [MbAction, ...MbAction[]] = ["acompanhar","comparecer","ignorar","ler","pagar","responder","revisar"];
export const MbReasonArrayValues: [MbReason, ...MbReason[]] = ["cobranca","compromisso","contato_pessoal","informativo","outro","pedido_direto","prazo_proximo","promocional","remetente_ignorado","suspeito","trabalho","vip"];
