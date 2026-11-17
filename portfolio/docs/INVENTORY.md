# Inventário de mídia — Portfólio Chagas

Levantamento feito em 2026-11-17 a partir do repositório. Origem = commit que adicionou o arquivo (`git log -- <arquivo>`).

**Observação importante sobre autoria:** todos os commits de mídia foram feitos por sessões do Claude (autor git "Claude"), ou seja, o arquivo foi gerado ou processado com IA a partir de material enviado por alguém. O repositório **não registra** quem filmou, editou ou é dono dos originais. Toda autoria abaixo é, no máximo, "provável" e precisa ser confirmada pelo Chagas antes da publicação.

Legenda de autoria: **próprio** (confirmado) · **provável** (indício forte, falta confirmar) · **terceiro** (claramente de outra pessoa/empresa) · **desconhecido**.

## Mídia de projeto

| Arquivo | Tipo | Dimensões / duração / tamanho | Origem (commit) | Autoria | Usar no portfólio? | Categoria sugerida |
|---|---|---|---|---|---|---|
| `videos/gameplay_4k_enhanced_leve.mp4` | Vídeo H.264 + AAC | 3840×1772, 60 fps, 13,9 s, 27,6 MB (~15,9 Mbps) | `91ebd58` 2026-10-10 "Add 4K enhanced gameplay video and before/after comparison" | **desconhecido** — imagens são de um jogo de corrida de terceiros; o trabalho seria só o tratamento/upscale | **com ressalva** — só como case de tratamento de vídeo, citando que as imagens do jogo não são autorais; confirmar quem fez o tratamento | Audiovisual (tratamento/finalização) |
| `videos/comparacao_antes_depois.jpg` | JPEG | 2560×900, 158 KB | `91ebd58` 2026-10-10 | idem acima | **com ressalva** — bom como capa/prova do antes × depois (ver Ressalvas) | Audiovisual |
| `resultado/moto-personagem.mp4` | Vídeo H.264 + AAC, vertical | 1180×2556, 60 fps, 10,8 s, 9,8 MB | `9b58559` 2026-10-09 "Adiciona vídeo da moto com o personagem no lugar do piloto" | **desconhecido** — é uma gravação de tela de celular (barra de status e moldura pretas visíveis); filmagem original de rua de autoria não registrada; substituição do piloto por personagem feita com IA | **com ressalva** — confirmar autoria da filmagem e do efeito; idealmente reexportar sem a barra de status do celular | Motion Design / Reels |
| `resultado/abertura-computador.jpg` | JPEG | 1646×1456, 242 KB | `63da9e5` 2026-10-09 "…add final screenshots" | **provável** (site Comunica+Fé) | **sim**, se o Chagas confirmar que o site é trabalho dele | Web / Design |
| `resultado/abertura-celular.jpg` | JPEG | 1678×590, 150 KB | `63da9e5` 2026-10-09 | **provável** | **sim**, mesma condição | Web / Design |
| `social/comunicafe-1200x630.jpg` | JPEG (imagem de compartilhamento/OG) | 1200×630, 77 KB | `cafd67e` 2026-10-09 "Rebrand the site from Pascom to Comunica+Fé" | **provável** | **com ressalva** — peça de apoio do case Comunica+Fé, não peça principal | Web / Design |

## Mídia que NÃO deve entrar como trabalho autoral

| Arquivo | Tipo | Dimensões / tamanho | Origem (commit) | Autoria | Usar? | Motivo |
|---|---|---|---|---|---|---|
| `fotos/carlo-acutis.jpg` | JPEG | 600×776, 141 KB | `d4d4e81` 2026-10-09 | **terceiro** | **não** | Foto do santo obtida para o site (o próprio `fotos/LEIA-ME.md` pede imagens de licença livre, ex. Wikimedia Commons). Não é fotografia do Chagas. |
| `midia/carlo-acutis-ilustracao.webp` | WebP | 900×1600, 337 KB | `d4d4e81` 2026-10-09 | **desconhecido** (provável geração por IA ou banco) | **não** como peça própria | Só aparece dentro do case Comunica+Fé, se for o caso. |
| `icones/*.webp` (11 arquivos: ampulheta, camera, celular, estrela, livros, lixeira, megafone, microfone, monitor, relogio, sino) | WebP | 192×192, 2–4 KB cada | `ccb9736` 2026-10-09 | **desconhecido** (ícones 3D gerados/obtidos para o site) | **não** | Asset de interface, não portfólio. |
| `icones/objetos/*.png` (8 arquivos) | PNG | 192×192, 16–30 KB | `eb8b178` 2026-10-09 | **desconhecido** | **não** | Idem. |
| `icones/vidro/*.png` (15 arquivos) | PNG | 184×184, 26–41 KB | `d4d4e81` 2026-10-09 | **desconhecido** | **não** | Idem. |
| `fotos/LEIA-ME.md` | Texto | 0,7 KB | `b8b6cee` | — | não | Instrução do site Comunica+Fé. |

## Outros projetos do repositório (código, sem mídia própria)

| Pasta | O que é (pelo `<title>`/estrutura) | Pode virar case? |
|---|---|---|
| `index.html`, `site/pagina.html` | Comunica+Fé — "Liturgia do dia, agenda e santos da comunicação" (Pastoral da Comunicação) | Sim, já coberto pelas capturas em `resultado/`. A CONFIRMAR se foi trabalho do Chagas e se a pastoral autoriza a divulgação. |
| `brabo-club/` | "Brabo Club — Corte de respeito" (app de agendamento de barbearia) | Possível case Web, mas **não há capturas de tela**. A CONFIRMAR autoria e se é cliente real. |
| `interactive-site/` | "Site Interativo Animado" | Sem capturas; provavelmente estudo/experimento. A CONFIRMAR. |
| `virtual-office-ai/` | App (Node) sem título HTML de topo | Não é peça visual; fora do portfólio por enquanto. |

## Ressalvas técnicas

- **Antes × depois do gameplay:** na imagem `comparacao_antes_depois.jpg` as duas metades estão muito parecidas e nenhuma delas tem rótulo "Antes"/"Depois". Do jeito que está, não comprova o ganho de qualidade. Sugestão: refazer com rótulos, recorte ampliado (zoom em detalhe) ou slider interativo.
- **Gameplay 4K:** 3840×1772 é proporção ~2,17:1 (ultrawide), não 16:9. A capa deve respeitar essa proporção ou usar `object-fit: cover`.
- **Moto:** o vídeo não tem poster/thumbnail no repositório; o desenvolvedor deve usar `preload="metadata"` ou extrair um frame. A gravação inclui a interface do celular — reexportar o arquivo original limpo.
- **Peso:** o MP4 4K tem 27,6 MB; para web, gerar versão 1080p (~4–6 MB) e manter a 4K como opcional.
- **Nenhuma fotografia autoral** (eventos, casamentos, ensaios) foi encontrada no repositório.
