# Decisões

| Data | Decisão | Motivo |
|---|---|---|
| 2026-11-17 | Projeto em `paroquia360/` dentro do repositório atual | Repositório já hospeda outros sites; isolar evita afetar a publicação do Comunica+Fé |
| 2026-11-17 | Next.js + TypeScript + Tailwind + Supabase + Vercel | Ver ARCHITECTURE.md |
| 2026-11-17 | Multi-tenant por `parish_id` + RLS + `memberships` | Isolamento garantido no banco, não só no código |
| 2026-11-17 | Admin geral sem acesso implícito a dados pastorais | LGPD: mínimo privilégio |
| 2026-11-17 | Floot só para protótipos de fluxo, nunca para dados reais | Evitar construir o produto duas vezes |
| 2026-11-17 | Protótipo em HTML único antes do app | Validar layout e navegação rápido e barato |
| 2026-11-17 | FKs compostas (parish_id, id) nas relações filhas | Mesmo com bug no código, o banco recusa ligar dados de paróquias diferentes |
| 2026-11-17 | Voluntário vê nomes via `parish_directory`, não a tabela `profiles` | Telefone e nascimento ficam só para equipe/coordenação |
| 2026-11-17 | Testes de RLS rodam em Postgres local com stub do `auth` | Validar segurança sem precisar de projeto Supabase |
| 2026-11-17 | Supabase em sa-east-1 (São Paulo), plano gratuito | Menor latência para o Brasil e dados pessoais no país (LGPD) |
| 2026-11-17 | Sem Tailwind/shadcn: app usa o CSS do protótipo | Evita manter dois design systems |
| 2026-11-17 | Middleware do Next em runtime Node (Next 15.5) | Usa `getUser()` com a mesma pilha do servidor; funciona atrás de proxy |
| 2026-11-17 | Login por link no e-mail, sem senha | Público pouco técnico; nada de senha para esquecer ou vazar |
| 2026-11-17 | Convite por link copiado, sem envio de e-mail | Não simular integração; envio real fica para quando houver SMTP próprio |
| 2026-11-18 | Publicação no Floot (projeto "Paróquia360") como interface React, falando com o mesmo Supabase via HTTP (Auth + PostgREST) | Pedido do cliente; o Floot não aceita o cliente oficial do Supabase, então `helpers/sb.tsx` usa fetch. Banco, RLS e login continuam só no Supabase |
| 2026-11-17 | Visual inspirado na referência enviada (moldura, notch, vidro), paleta navy/dourado | Pedido do cliente |
