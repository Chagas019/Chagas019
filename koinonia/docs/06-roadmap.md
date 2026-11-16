# Roadmap e status

| Fase | Escopo | Banco | Interface | Testes |
|---|---|---|---|---|
| 1 | Arquitetura, autenticação, Design System | ✅ | ✅ cadastro, login, recuperação/redefinição de senha, confirmação de e-mail, onboarding, i18n | ✅ |
| 2 | Perfis e comunidades | ✅ | ✅ perfil (talentos, portfólio, privacidade), perfil público, comunidades (cadastro, página, membros, verificação) | ✅ |
| 3 | Talentos, busca e oportunidades | ✅ | ✅ busca de talentos, oportunidades (lista/filtros/paginação, detalhe, criação, publicação), candidaturas | ✅ |
| 4 | Match Missionário | ✅ | ✅ recomendações com explicação + voluntários sugeridos por oportunidade | ✅ |
| 5 | Mensagens e notificações | ✅ (RPCs, bloqueios, permissões) | 🟡 notificações no painel; **UI de mensagens pendente** | 🟡 SQL |
| 6 | Recursos compartilhados | ✅ (tabelas, transições, notificações) | ⏳ pendente | 🟡 parcial |
| 7 | Avaliações e administração | ✅ | 🟡 avaliações exibidas no perfil; **formulário de avaliação pendente**; admin: fila de verificação e denúncias ✅ | ✅ SQL |
| 8 | Segurança, QA, performance, lançamento | 🟡 | 🟡 | 🟡 |

## Próximos passos sugeridos
1. UI de mensagens (lista de conversas, conversa com Supabase Realtime) e botão "Enviar mensagem" no perfil.
2. Banco de recursos (listar, cadastrar, solicitar, aprovar).
3. Formulário de avaliação após colaboração concluída; histórico de colaborações no perfil.
4. Upload de avatar e logotipo (buckets já criados).
5. Exclusão/exportação de conta (Edge Function).
6. Traduções completas en/es; medir Web Vitals no preview da Vercel.

## Performance (medida em build de produção local, Chromium)
| Página | HTML | JS (descomprimido) | CSS | LCP | CLS |
|---|---|---|---|---|---|
| `/` | 46 KB | 518 KB | 44 KB | 336 ms | 0.000 |
| `/cadastro` | 53 KB | 532 KB | 44 KB | 184 ms | 0.000 |
| `/oportunidades` | 65 KB | 518 KB | 44 KB | 176 ms | 0.000 |

Bug corrigido: o `loading.tsx` global causava CLS de 0,276 (home) e 0,115 (cadastro) — o spinner de 50vh era substituído pelo conteúdo e deslocava o rodapé. Regressão coberta em `tests/e2e/quality.spec.ts`.
Oportunidade: os formulários recebem o dicionário inteiro de traduções; passar só os namespaces usados reduz o payload RSC.
