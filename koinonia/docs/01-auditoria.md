# Auditoria inicial do repositório (16/11/2026)

## O que existia
| Pasta | Conteúdo | Stack | Relação com a KOINONIA |
|---|---|---|---|
| `/index.html`, `site/`, `fotos/`, `midia/`, `icones/`, `social/` | Site estático Comunica+Fé (270 KB em um único HTML) | HTML/CSS/JS puro, GitHub Pages | Nenhuma |
| `brabo-club/` | Agendamento de barbearia | Vercel Functions + `@vercel/blob` | Nenhuma |
| `virtual-office-ai/` | Escritório virtual de agentes de IA | Node 22 puro + SDK Anthropic | Nenhuma |
| `interactive-site/` | Página animada | HTML estático | Nenhuma |
| `.github/workflows/` | Publicação do site e checagem do Brabo Club | GitHub Actions | Mantidos intactos |

## Diagnóstico
- Não havia código, banco, autenticação nem `package.json` da KOINONIA; também não havia `package.json` na raiz (cada projeto é independente).
- Nenhum padrão de testes compartilhado (há apenas `tests/e2e.js` do site estático).
- Ambiente disponível: Node 22, PostgreSQL 16 (binários), Chromium/Playwright. Sem Docker → não é possível subir o Supabase completo localmente nesta máquina; migrations e RLS são testadas em Postgres puro com um *stub* do schema `auth`.

## Decisão
Criar a KOINONIA como projeto isolado em `koinonia/`, sem alterar os projetos existentes (regra 7: não remover funcionalidades). Adicionado apenas um workflow novo (`.github/workflows/koinonia-ci.yml`) com filtro de caminho `koinonia/**`.
