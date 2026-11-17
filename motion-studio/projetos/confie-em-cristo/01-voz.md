# 01 — VOZ — confie-em-cristo

> **AVISO: ainda não existe arquivo de áudio.** A ElevenLabs estava indisponível, então `arquivo: null`.
> Os timestamps vêm de um **roteiro cronometrado manualmente** para o texto exato da narração do briefing.
> São estimativas e não têm a precisão de 1 frame. Quando chegar o áudio real ("Dantas", eleven_v4):
> normalizar para `public/audio/narracao/confie-em-cristo.wav` (48 kHz, -16 LUFS), transcrever,
> regerar `palavras`/`impactos` e avisar CENAS/TEXTO/SOM, porque todos os tempos vão mudar.

## Método
- 93 palavras, com o texto e a pontuação do briefing preservados (nenhuma palavra inventada).
- Duração de cada palavra = 40 ms + 103 ms × sílabas (monossílabos átonos 150–180 ms), mais 20 ms de ligação entre palavras.
  Última palavra de cada frase ×1,25 (alongamento da tônica final). Palavras-chave ×1,22.
  Ajustes extras: "confie" ×1,55, "Cristo" ×1,35, "Deus" ×1,45, "lado"/"vida" ×1,4, "Jesus" ×1,15, "escute" ×1,1. A frase final é 12% mais lenta.
- Pausas: abertura escura de 900 ms. Entre frases, 600–900 ms. **1200 ms antes de "Mas escute"**. 550 ms depois de "escute:".
  **350 ms antes de cada "confie" curto**. 450 ms depois de "lembre-se:". **1000 ms antes de "Confie em Cristo"**.
  Vírgulas entre 250 e 300 ms. **Respiro final de 2500 ms**.
- Ritmo médio: 1,99 palavra/s no total (93 palavras em 46,6 s). O alvo de ~2,3 palavras/s não cabe junto com
  as pausas pedidas e os 44–48 s. Por isso priorizei a duração e as pausas. Durante a fala, o ritmo fica em ~3,1 palavras/s.
- Validação: palavras em ordem, nenhuma sobreposição (`endMs ≤ próximo startMs`), `duracaoMs` (46648) ≥ último `endMs` (44148) + 2500.
  `npx tsc --noEmit` passou.

## Duração
**46648 ms = 2799 frames a 60 FPS.**

## Tabela por frase
| # | Frase | startMs | endMs | frames |
|---|---|---|---|---|
| 1 | Talvez você não entenda o que está acontecendo agora. | 900 | 3574 | 54–214 |
| 2 | Talvez os seus planos não estejam saindo como você imaginou. | 4324 | 7114 | 259–427 |
| 3 | Talvez você esteja cansado de esperar por uma resposta. | 7864 | 10568 | 472–634 |
| 4 | Mas escute: | 11768 | 12516 | 706–751 |
| 5 | Deus não perdeu o controle da sua história. | 13066 | 15539 | 784–932 |
| 6 | Confiar em Cristo não significa entender todos os caminhos. | 16439 | 19339 | 986–1160 |
| 7 | Significa continuar caminhando, mesmo quando você não consegue enxergar o destino. | 19939 | 24356 | 1196–1461 |
| 8 | Quando faltar força, confie. | 25256 | 27197 | 1515–1632 |
| 9 | Quando faltar direção, confie. | 27947 | 30045 | 1677–1803 |
| 10 | Quando tudo parecer impossível, lembre-se: Jesus continua ao seu lado. | 30895 | 35405 | 1854–2124 |
| 11 | Não tenha medo do amanhã. | 36305 | 37732 | 2178–2264 |
| 12 | Confie em Cristo. | 38732 | 40062 | 2324–2404 |
| 13 | Ele é o caminho, a verdade e a vida. | 40762 | 44148 | 2446–2649 |
| — | respiro final | 44148 | 46648 | 2649–2799 |

## Pausas ≥ 400 ms (candidatas a corte/transição)
| inícioMs | fimMs | ms | entre |
|---|---|---|---|
| 3574 | 4324 | 750 | agora. → Talvez |
| 7114 | 7864 | 750 | imaginou. → Talvez |
| **10568** | **11768** | **1200** | resposta. → Mas escute (a maior: virada escuridão → luz) |
| 12516 | 13066 | 550 | escute: → Deus |
| 15539 | 16439 | 900 | história. → Confiar |
| 19339 | 19939 | 600 | caminhos. → Significa |
| 24356 | 25256 | 900 | destino. → Quando |
| 27197 | 27947 | 750 | confie. → Quando |
| 30045 | 30895 | 850 | confie. → Quando |
| 33324 | 33774 | 450 | lembre-se: → Jesus |
| 35405 | 36305 | 900 | lado. → Não |
| **37732** | **38732** | **1000** | amanhã. → Confie em Cristo |
| 40062 | 40762 | 700 | Cristo. → Ele |

Pausas curtas entre 250 e 399 ms: 21572–21852 (caminhando,), 26266–26616 (força, → confie), 29114–29464 (direção, → confie), 32588–32888 (impossível,), 42030–42280 (caminho,).

## Impactos
| ms | palavra | tipo |
|---|---|---|
| 10568 | (silêncio antes de Mas escute) | pausa |
| 11931 | escute | enfase |
| 13938 | controle | enfase |
| 20883 | caminhando | enfase |
| 26616 | confie (1º) | enfase |
| 29464 | confie (2º) | enfase |
| 33774 | Jesus | enfase |
| 37732 | (silêncio antes de Confie em Cristo) | pausa |
| 38732 | Confie (final) | enfase |
| 39495 | Cristo (final) | climax |

## Pedidos a outros agentes
- CENAS e TEXTO: use os tempos via `vozConfie` (`palavras`, `pausas`, `impactos`) e `msParaFrame()`. Não copie números para outros arquivos, porque eles vão mudar quando chegar o áudio real.
- SOM: não coloque a narração enquanto `arquivo === null`. Faça o ducking a partir de `palavras`.

## ENTREGA — motion-voz — confie-em-cristo
Status: parcial (roteiro cronometrado; falta o áudio real)
Arquivos alterados: motion-studio/src/projetos/confie-em-cristo/voz.ts, motion-studio/projetos/confie-em-cristo/01-voz.md
Contrato exportado: `vozConfie: AnaliseVoz` (arquivo: null, duracaoMs: 46648, 93 palavras, pausas = detectarPausas(p, 250), 10 impactos)
Validação feita: `cd motion-studio && npx tsc --noEmit` passou. Script confirmou ordem, nenhuma sobreposição e duracaoMs ≥ último endMs.
Pedidos a outros agentes: CENAS/TEXTO: ler os tempos de `vozConfie` sem copiar números · SOM: sem narração enquanto arquivo for null
Riscos/pendências: tempos estimados, não medidos. Quando chegar o áudio da ElevenLabs, a VOZ precisa normalizar, transcrever e regerar, e as cenas precisam ser recalculadas. O ritmo total ficou em ~2,0 palavras/s (e não 2,3) para respeitar as pausas e os 44–48 s.
