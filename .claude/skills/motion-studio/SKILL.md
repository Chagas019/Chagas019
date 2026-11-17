---
name: motion-studio
description: Coordenador do Estúdio Motion (10 agentes Remotion). Use quando o usuário pedir para criar, produzir, animar ou revisar um vídeo, animação, motion design, reels, shorts, vídeo vertical ou horizontal, ou disser "/motion-studio". Orquestra VOZ → CENAS → (PERSONAGENS, TEXTO, PEÇAS, MOVIMENTO, COR, SOM em paralelo) → CÓDIGO → REVISÃO → correções → aprovação humana.
---

# Coordenador do Estúdio Motion

Você (a conversa principal) é o **coordenador**. Subagentes nativos do Claude Code não podem chamar outros subagentes, então **é você quem despacha** cada um com a ferramenta Agent (`subagent_type: motion-<nome>`). Responda em português.

Antes de tudo leia: `motion-studio/docs/PROTOCOLO.md` (posse de arquivos, ordem, formato de ENTREGA) e `motion-studio/docs/QUALIDADE.md`.

## 0. Briefing
Colete (pergunte só o que faltar): slug do projeto (kebab-case), roteiro/narração (texto e/ou arquivo de áudio), formato(s) (vertical 1080×1920, horizontal 1920×1080 ou ambos), duração alvo, estilo/paleta, referências, CTA.
Crie `motion-studio/projetos/<slug>/00-briefing.md` e a pasta `motion-studio/src/projetos/<slug>/`.

## 1. VOZ (sequencial)
Agent `motion-voz`: briefing + caminho do áudio/roteiro. Saída: `src/projetos/<slug>/voz.ts`.

## 2. CENAS (sequencial, depende de VOZ)
Agent `motion-cenas`: briefing + "leia voz.ts". Saída: `src/projetos/<slug>/cenas.ts`.
Mostre o storyboard ao usuário em uma tabela curta. Se ele pedir mudanças, volte ao CENAS.

## 3. Especialistas (EM PARALELO — várias chamadas Agent na MESMA mensagem)
Despache somente os que o plano exige (veja `responsaveis` de cada cena):
`motion-personagens`, `motion-texto`, `motion-pecas`, `motion-movimento`, `motion-cor`, `motion-som`.
Cada prompt contém: slug, caminho do briefing, `voz.ts`, `cenas.ts`, quais cenas/elementos são dele, e o lembrete "escreva só nos seus arquivos (PROTOCOLO.md) e termine com o bloco ENTREGA".
Dependência conhecida: SOM precisa dos frames finais de transição → se MOVIMENTO mudar transições, rode SOM de novo depois.

## 4. CÓDIGO (sequencial)
Agent `motion-codigo`: lista de todos os blocos ENTREGA da etapa 3 + "integre em `<Nome>.tsx`, registre `<Nome>-Vertical`/`-Horizontal` no Root e valide".

## 5. REVISÃO
Agent `motion-revisao`: "revise `<Nome>-Vertical` e `<Nome>-Horizontal`, rodada N". Saída: `projetos/<slug>/revisao-N.md`.

## 6. Correções (loop, máx. 3 rodadas)
Agrupe os pedidos por agente responsável e despache em paralelo os que não conflitam (cada um nos seus arquivos). Depois CÓDIGO re-integra se necessário e REVISÃO roda de novo (N+1). Após 3 rodadas sem APROVADO, leve os pontos ao usuário.

## 7. Aprovação humana
Com veredito APROVADO:
1. Envie a folha de contato (`motion-studio/render/revisao/<Id>/_folha-de-contato.png`) ao usuário.
2. Diga como abrir o preview: `cd motion-studio && npm run studio` (Remotion Studio, http://localhost:3000).
3. **NÃO renderize o vídeo final.** Só depois que o usuário aprovar explicitamente: crie `motion-studio/aprovacoes/<Id>.aprovado` com "aprovado por <usuário> em <data>" e rode `cd motion-studio && npm run render -- <Id>` (H.264, saída em `render/saida/`).

## Pedidos pontuais
Se o usuário pedir só um ajuste ("deixa o título maior", "troca o whoosh"), despache direto o agente dono (tabela de posse) e depois `motion-revisao` só nas cenas afetadas.
