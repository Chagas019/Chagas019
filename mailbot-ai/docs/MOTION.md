# Movimento e materiais (estilo iOS)

Os tokens de animação do MAILBOT vêm do guia de movimento do **Vetro** (github.com/Phnem/Vetro, licença MIT, `vetro_echoic_ios_motion_guidebook.md`), que converte as molas do SwiftUI em `stiffness` e `dampingRatio`. Aqui eles viram curvas CSS `linear()` geradas pela mesma física do oscilador amortecido (`node scripts/spring-tokens.mjs`).

| Token | stiffness / damping | Duração | Uso no MAILBOT |
|---|---|---|---|
| `--spring-standard` | 130,5 / 0,825 | 760 ms | entrada de cartões e seções |
| `--spring-sheet` | 380 / 0,86 | 450 ms | troca de tela |
| `--spring-pop` | 500 / 0,75 | 360 ms | balões do chat |
| `--spring-press` | 987 / 0,60 | 330 ms | toque: botões, cartões, chips e abas afundam para 0,96 |
| `--spring-hero` | 157,9 / 0,70 | 820 ms | reservado (cartão → tela) |
| `--spring-bar` | 500 / 0,90 | 380 ms | reservado (barras) |

Materiais: `--glass-thin` (blur 20px, saturação 180%) na barra de abas; `--glass-regular` (blur 28px) no campo do chat.
Raios: 14px nos botões e campos, 20–22px nos cartões, 28px nos painéis grandes.
Com `prefers-reduced-motion`, todas as animações são desligadas.
