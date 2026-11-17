# Conteúdo do portfólio — CHAGAS CREATIVE (v3)

Fonte dos fatos: `docs/BRIEFING.md`. Dados: `content/portfolio.json` e `content/pricing.json` (único arquivo de preços).
Estratégia de preços anterior fica em `docs/PRICING.md` (apenas referência; não é usada pelo site).

## Mapa de conteúdo por seção

| Âncora | Fonte (JSON) | O que aparece |
|---|---|---|
| `#home` | texto fixo no `index.html` + `site` | Título "CRIATIVIDADE QUE TRANSFORMA IDEIAS EM EXPERIÊNCIAS.", subtítulo = `site.tagline`, botões #projetos / #orcamento |
| `#sobre` | `about`, `timeline`, `tools`, `equipment` | 4 parágrafos (texto do usuário, ajustes leves), linha do tempo de 4 marcos, ferramentas com usos, equipamentos e conhecimentos |
| `#servicos` | `areas` (5) | Fotografia, Audiovisual, Design e Motion, Comunicação Digital, Produtos Digitais — intro + itens |
| `#portfolio` | `categories`, `projects`, `missing` | 3 trabalhos reais; categorias sem material vão para "Em curadoria" |
| `#projetos` | `selected` (11) | Filtro realizado / pessoal / conceitual; Koinonia com slogan |
| `#produtos` | `products` + `pricing.products` | 5 produtos, preço `null` → "Sob consulta", disponibilidade "a confirmar", botão "Tenho interesse" (WhatsApp) |
| `#orcamento` | `pricing.groups`, `disclaimer`, `note`, `terms` | 4 grupos, 12 itens "a partir de", aviso e nota literais do briefing |
| `#contato` | `site` | WhatsApp, Instagram, e-mail, localização |

## Decisões de texto

- **Tom:** primeira pessoa no Sobre (é a voz do Chagas); terceira pessoa neutra nas intros. Frases curtas, concretas, sem jargão de agência e sem fórmulas genéricas de IA.
- **Sobre:** texto do usuário quebrado em 4 parágrafos; só troquei "utilizando" por "usando" e "Com o passar do tempo" por "Com o tempo".
- **Linha do tempo:** apenas fatos do briefing. Único ano citado é 2019. Os outros marcos usam rótulos sem data ("Ao longo do caminho", "Comunidades", "Hoje") para não inventar cronologia.
- **Ferramentas:** sem nível ou porcentagem; cada uma traz onde é usada (`uses`) e um contexto. Claude Code e Codex descritos como "apoio no desenvolvimento", sem atribuir projetos específicos.
- **Equipamentos:** nota "já utilizados ou explorados". Não sugerir que estão disponíveis para locação ou que todos estão em uso hoje.
- **Projetos selecionados:** resumo = fato do briefing, quase literal; `role` derivado do próprio resumo. `year` sempre `null` (não informado). Gincana: `status: "previsto 2027"` (10ª edição). Koinonia e PASCOM+ marcados como **conceitual** — o texto diz "conceito de plataforma", nunca "plataforma lançada".
- **Produtos:** descrições genéricas e honestas (tipo de recurso + aplicativo). Não citar número de presets, compatibilidades extras ou estilos que o usuário não descreveu.
- **Preços:** valores exatos do usuário; `desc` com "geralmente inclui…" e sem quantidades de fotos/horas. Termos marcados como "Condições a combinar".
- **Portfólio (3 trabalhos reais):** caminhos de mídia mantidos. Comunica+Fé encaixa na comunicação para igrejas; `role` segue "A CONFIRMAR".
- **Categorias:** reorganizadas para as novas áreas (eventos, ensaios, casamentos e 15 anos, retratos, institucional e imóveis, audiovisual, reels, motion, design, web). Ids `audiovisual`, `motion-design` e `web-design` foram mantidos para não quebrar os projetos.
- **`categories[].intro` é público** (escrito para visitantes). **`missing[].note` é interno** (não exibir literalmente).
- Bloco `profile` antigo (placeholders de CV) removido: `timeline` + `tools` + `equipment` o substituem.

## O que ainda é placeholder

- `about.photo`, `selected[].cover/media/links`, `products[].image`: `null` / vazios.
- `pricing.products`: todos `null` → "Sob consulta".
- `site.url`: vazio; `robots.txt` e `sitemap.xml` usam `https://SEU-DOMINIO`.
- `projects[].role`: "A CONFIRMAR" nos 3 trabalhos.
- `products[].availability`: "a confirmar".

## MATERIAIS FALTANTES (checklist para o Chagas)

### Fotos reais por categoria (JPEG sRGB, lado maior ≥ 2560 px, com autorização de uso)
- [ ] Eventos — 3 a 5 eventos, 12–20 fotos cada (Lual Mariano, Retiro PAFIES, AVIVA 2 são bons candidatos)
- [ ] Ensaios — 3 a 6 ensaios, 8–15 fotos cada
- [ ] Casamentos e 15 anos — 2 a 4 trabalhos, 15–25 fotos cada (autorização escrita; menores via responsáveis)
- [ ] Retratos — 6 a 12 fotos
- [ ] Institucional / ambientes / imóveis — 1 a 3 trabalhos
### Vídeo e design
- [ ] Reels autorais — 3 a 6 vídeos 1080×1920 MP4 H.264 + poster
- [ ] Audiovisual autoral — aftermovie/institucional 1920×1080; showreel de 60–90 s, se possível
- [ ] Motion — original limpo do "Personagem na moto" (sem barra de status) + animações tipográficas
- [ ] Design — 6 a 12 artes para redes/eventos; identidade visual, se houver
### Projetos selecionados
- [ ] 1 capa por projeto (16:10, ≥ 1600 px) e links públicos, se existirem
- [ ] Anos de cada projeto (opcional) e confirmação de papel em cada um
### Perfil e produtos
- [ ] Foto de perfil vertical (4:5, ≥ 1600 px, fundo neutro)
- [ ] Imagens dos 5 produtos (capa + antes/depois)
- [ ] Preços dos produtos e links de compra (se houver loja)
- [ ] Disponibilidade real de cada produto
### Publicação
- [ ] Domínio definido → preencher `site.url`, `robots.txt`, `sitemap.xml`, canonical e og:url
- [ ] Imagem de compartilhamento (1200×630) da marca CHAGAS CREATIVE
- [ ] Confirmar autoria e autorização de divulgação do Comunica+Fé
- [ ] Depoimentos: só reais e autorizados (nenhum foi incluído)

## Regras para editar o conteúdo

1. Nunca inventar cliente, métrica, resultado, data, depoimento, link ou disponibilidade.
2. Novo trabalho real → `projects` com `status: "real"`; se a categoria sair de "Em curadoria", remover a entrada correspondente em `missing`.
3. Preço novo ou alterado → somente `pricing.json`.
4. Validar sempre: `python3 -m json.tool content/portfolio.json` e `content/pricing.json`.
