# Visão geral

**Produto:** Paróquia360 — SaaS de gestão paroquial multi-tenant (paróquias, comunidades, dioceses).
**Problema:** escalas em grupos de WhatsApp e planilhas, voluntários sem cadastro, agenda espalhada, comunicação sem histórico, dados pessoais (inclusive de menores) sem controle.
**Proposta:** um único ambiente para escalas, pastorais, agenda, voluntários, eventos, comunicação e relatórios.

## Personas
| Perfil | Precisa de |
|---|---|
| Pároco | Visão geral, aprovar comunicados, saber o que está descoberto |
| Administrador paroquial / secretaria | Agenda, cadastros, pendências, relatórios |
| Coordenador de pastoral | Montar escalas, achar substitutos, avisar a equipe |
| Agente pastoral | Ver o que lhe cabe, registrar atividades |
| Voluntário | Ver escala, confirmar, pedir troca, oferecer ajuda |
| Administrador geral (plataforma) | Criar paróquias, suporte; **sem** acesso a dados pastorais por padrão |

## MVP (Fase 4) — escopo fechado
1. Autenticação + convite por e-mail + vínculo usuário↔paróquia com papel.
2. Pastorais (cadastro, coordenadores, membros ativos).
3. Agenda (missas, reuniões, formações, festas) — lista + calendário mensal.
4. Escalas (funções por celebração, atribuição, confirmação, pedido de substituição).
5. Voluntários (perfil, talentos, disponibilidade, pastorais) + **Preciso de Ajuda**.
6. Dashboard com os itens acima (sem métricas inventadas: só o que existe no banco).

Fora do MVP: inscrições/QR Code, financeiro, central de mensagens, relatórios exportáveis, push nativo (Fase 5).

## Histórias-chave
- Como **coordenador**, crio a escala do domingo escolhendo voluntários disponíveis para cada função, para não depender de grupo de WhatsApp.
- Como **voluntário**, confirmo minha presença ou peço substituição em um toque.
- Como **coordenador da PASCOM**, publico "preciso de um fotógrafo dia 08/12" e só voluntários com esse talento e livres naquela data são convidados.
- Como **pároco**, vejo no painel quais celebrações da semana têm escala incompleta.
