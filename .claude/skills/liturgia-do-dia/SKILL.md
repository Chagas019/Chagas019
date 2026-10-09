---
name: liturgia-do-dia
description: Busca a liturgia diária na Canção Nova (https://liturgia.cancaonova.com/pb/) e publica no site da Comunica+Fé as referências das leituras e o refrão do salmo como frase do dia. Use quando pedirem para atualizar, buscar ou publicar a liturgia do dia ou a frase litúrgica do dia, e na tarefa diária agendada.
---

# Liturgia do dia → site da Comunica+Fé

Publica, no banco de dados do site (artifact https://claude.ai/artifact/UchkS7oWPJt5ATvTpoVzKn),
as leituras do dia e o refrão do salmo como frase do dia, com a Canção Nova como fonte.

## 1. Buscar a página

- Data de hoje no fuso de Brasília: `TZ=America/Sao_Paulo date +%F` → `HOJE` (ex.: `2026-10-09`).
- Leia https://liturgia.cancaonova.com/pb/ (WebFetch, ou `curl -sL -A "Mozilla/5.0"`).
- **Se a página não abrir** (DNS, 403, host bloqueado pela rede do ambiente): pare e informe
  exatamente o erro e que `liturgia.cancaonova.com` precisa estar em *Allowed domains* da rede
  do ambiente. **Não publique nada de memória nem invente leituras.**

## 2. Extrair (copiando exatamente como está na página)

| Campo | Exemplo | Observação |
|---|---|---|
| data da página | sexta-feira, 9 de outubro de 2026 | tem de ser `HOJE`; se for outro dia, pare e avise |
| `primeira` | Gl 3,7-14 | referência da 1ª leitura |
| `salmo` | Sl 110(111),1-2.3-4.5-6 | referência do salmo |
| `refrao` | O Senhor se lembra sempre da Aliança. | sem o "R." inicial |
| `segunda` | (vazio em dias de semana) | só domingos e solenidades |
| `evangelho` | Lc 11,15-26 | referência do Evangelho |

Confira que cada valor aparece literalmente no texto da página. O que não aparecer fica `""`.
Guarde só referências e o refrão (frase curta). **Não copie os textos completos das leituras**:
eles têm direitos autorais; o site já mostra o link para a Canção Nova.

## 3. Publicar no site (ferramenta ArtifactData, `url` do artifact acima)

**Liturgia** — coleção `liturgia`, documento `HOJE`:
```json
{ "primeira": "...", "salmo": "...", "refrao": "...", "segunda": "", "evangelho": "...",
  "texto": "", "fonte": "cancaonova", "criadoPor": null, "atualizadoEm": <ms desde 1970> }
```
Faça `get` antes: se o documento já existir, use `set` com `if_version` da leitura; se a equipe já
publicou algo diferente hoje, não sobrescreva — avise.

**Frase do dia** — coleção `frases`. Antes, `query` com `where: [["dia","==",HOJE]]`; se já houver
frase com o mesmo texto, não crie outra. Senão, `set` no documento `liturgia-HOJE`:
```json
{ "texto": "<refrão>", "autor": "Salmo responsorial (<salmo sem o trecho (R. ...)>)",
  "dia": "HOJE", "fonte": "cancaonova", "criadoPor": null, "criadoEm": <ms desde 1970> }
```
Sem refrão na página, use um versículo curto do Evangelho copiado literalmente, com
`autor: "Evangelho (<referência>)"`.

## 4. Conferir e relatar

Leia de volta `liturgia/HOJE` e a frase criada (`get`) e responda em português, em poucas linhas:
data, referências publicadas, a frase e a fonte — ou o motivo exato de não ter publicado.

## Tarefa diária

Para rodar sozinho todo dia, crie uma Routine (create_trigger, nova sessão a cada disparo) com
`CRON_TZ=America/Sao_Paulo 0 5 * * *` e o prompt: "Use a skill liturgia-do-dia para publicar a
liturgia e a frase de hoje no site da Comunica+Fé." Só faça isso depois de uma execução manual bem-sucedida.
