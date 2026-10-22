# CLAUDE.md

Responda em português. Seja objetivo.

## Projeto
Site estático da Comunica+Fé.

- Edite sempre `site/pagina.html` (fonte única). `bash scripts/montar-site.sh` gera o `index.html` de hospedagem com metadados, `robots.txt` e `sitemap.xml`.
- Ícones em `icones/`, prévia social em `social/`, fotos em `fotos/`.
- Sem dependências de build: só `bash` e `python3`. Testes em `tests/`.
- Publicação: GitHub Pages pelo workflow `.github/workflows/publicar-site.yml` (manual). Para publicar, use o agente `deployment-engineer`.
- A pasta `.claude/` nunca é publicada.

## Regras gerais
- **Economia**: leia só os arquivos necessários, busque antes de abrir, não releia o que já está no contexto e faça a menor mudança que resolve. Respostas curtas: o que mudou, onde e como verificar.
- **Investigue antes de alterar**: reproduza o erro e encontre a causa raiz; nada de correção improvisada.
- **Reaproveite** estilos, variáveis CSS e padrões já existentes na página. Não crie arquivos, abstrações nem dependências que a tarefa não pede.
- **Design**: nada de layout genérico ou com cara de template. Hierarquia clara, escala de espaçamento e tipográfica, estados completos e responsivo de 360px a ultrawide.
- **Movimento**: anime só `transform`/`opacity` e respeite `prefers-reduced-motion`.
- **Acessibilidade**: HTML semântico, teclado, foco visível, contraste AA e `alt` nas imagens.
- **Performance e SEO**: imagens otimizadas com dimensões, metadados corretos em cada página.
- **Segurança**: nenhum segredo no código.
- **Antes de concluir**: rode os testes de `tests/` ligados à mudança e confira a página montada.

## Skills (`.claude/skills/`)
Carregue a skill relevante para a tarefa:

| Área | Skills |
|---|---|
| Design | `premium-ui-ux`, `creative-web-designer`, `anti-generic-design`, `art-direction`, `design-system-tokens`, `responsive-layout`, `ui-ux-pro-max`, `ui-styling`, `design`, `design-system`, `brand`, `banner-design`, `slides` |
| 3D e movimento | `web-3d-experience`, `realistic-materials`, `motion-design-engineer` |
| Engenharia | `frontend-architect`, `clean-components`, `root-cause-debugging`, `backend-api-design`, `database-modeling`, `security-audit` |
| Qualidade | `token-efficiency`, `performance-engineer`, `qa-testing`, `accessibility-audit`, `seo-optimization` |
| Conteúdo | `liturgia-do-dia` |

Ter uma skill não instala bibliotecas nem configura integrações: confira o projeto e a documentação antes de usar uma ferramenta.
