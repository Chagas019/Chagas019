// Rótulos em português para os valores estruturados da triagem (usado no front e no back).
export const mailLabels = {
  priority: { urgente: "Urgente", importante: "Importante", normal: "Normal", baixa: "Baixa prioridade", spam: "Possível spam" } as Record<string, string>,
  category: { trabalho: "Trabalho", financeiro: "Financeiro", pessoal: "Pessoal", compromissos: "Compromissos", informativos: "Informativo" } as Record<string, string>,
  action: {
    responder: "Responder", pagar: "Pagar", comparecer: "Confirmar presença", revisar: "Revisar com atenção",
    acompanhar: "Acompanhar", ler: "Ler quando puder", ignorar: "Pode ignorar",
  } as Record<string, string>,
  reason: {
    prazo_proximo: "Prazo próximo", pedido_direto: "Pedido direto a você", cobranca: "Cobrança ou pagamento",
    compromisso: "Compromisso marcado", trabalho: "Assunto de trabalho", contato_pessoal: "Contato pessoal relevante",
    informativo: "Informativo", promocional: "Mensagem promocional em massa", suspeito: "Mensagem suspeita",
    vip: "Remetente VIP", remetente_ignorado: "Remetente na sua lista de ignorados", outro: "Outro motivo",
  } as Record<string, string>,
};
