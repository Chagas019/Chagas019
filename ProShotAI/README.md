# ProShot AI — câmera profissional para iPhone

App nativo (Swift 5 + SwiftUI + AVFoundation + Core Image + Photos + Core Motion). Sem dependências externas.

## Compilar e instalar no iPhone
1. Mac com **Xcode 16+**; iPhone com **iOS 17+**.
2. Abra `ProShotAI/ProShotAI.xcodeproj`.
3. Target **ProShotAI → Signing & Capabilities**: escolha seu *Team* (Apple ID grátis serve) e, se preciso, troque o *Bundle Identifier* (`com.proshotai.camera`).
4. Conecte o iPhone, ative o **Modo Desenvolvedor** (Ajustes > Privacidade e Segurança), selecione o aparelho e **Run (⌘R)**.
5. Na primeira execução, autorize Câmera e Fotos.

Linha de comando: `xcodebuild -project ProShotAI.xcodeproj -scheme ProShotAI -destination 'generic/platform=iOS' CODE_SIGNING_ALLOWED=NO build`
Testes: `xcodebuild -project ProShotAI.xcodeproj -scheme ProShotAI -destination 'platform=iOS Simulator,name=iPhone 16' test`
CI: `.github/workflows/proshot-ai.yml` (build de dispositivo + testes no simulador, macOS 15).

## Estrutura
| Pasta | Conteúdo |
|---|---|
| `Camera/` | `CameraEngine` (sessão, lentes, ISO/obturador/foco/WB/EV manuais, semi-automático, AE/AF lock, captura, burst, timer, flash/lanterna), `FrameAnalyzer` (histograma, peaking, zebra, lupa), `MotionMonitor` (nível), `ExposureMath`, `PhotoCaptureProcessor` |
| `Processing/` | `ImageProcessor` (pipeline Core Image, decodificação RAW com `CIRAWFilter`, exportação JPEG/HEIF 10-bit/TIFF 16-bit, edição não destrutiva via `PHContentEditingOutput`), `EditSettings` (ajustes, perfis, 11 presets) |
| `Library/` | `PhotoLibrary` (salvar RAW+processado como par, leitura, exclusão) |
| `UI/` | Tela da câmera, dials, ferramentas, galeria, EXIF, editor, curva de tons, configurações |

## Funcionalidades
**Captura:** HEIF, JPEG, RAW DNG (Bayer), RAW+HEIF, Apple ProRAW — cada formato só aparece habilitado se o hardware suportar; resolução máxima do sensor (até 48 MP onde houver); flash off/auto/on e lanterna; temporizador 3/10 s (cancelável); disparo contínuo 5/10; orientação correta via giroscópio.
**Manual:** ISO, obturador, foco (posição da lente), WB temperatura + matiz, compensação EV em 1/3; modos **prioridade de ISO** e **prioridade de obturador** reais (o parâmetro livre segue o fotômetro do sensor); toque = foco/exposição no ponto; toque longo = AE/AF LOCK.
**Lentes:** ultra-grande-angular / grande-angular / tele / frontal descobertas no aparelho; zoom óptico (troca de lente) separado do zoom digital (pinça, indicador "DIGITAL ×"); focal equivalente 35 mm calculada do FOV real.
**Ferramentas:** histograma RGB+luma com alerta de clipping, focus peaking (sensibilidade ajustável), zebra (limiar 80–100%), nível eletrônico (roll + pitch), fotômetro −3…+3 EV, medidor de luz (EV100 e lux), lupa de foco no modo MF, grades (terços, áurea, quadrado), EXIF da última foto e na galeria.
**Edição:** exposição, contraste, realces, sombras, temperatura, matiz, saturação, vibração, nitidez, redução de ruído (no demosaico quando RAW), curva de tons de 5 pontos, 7 perfis de cor, 11 presets, comparar com original (toque longo). Salvar = não destrutivo (reversível no app Fotos; reabrir retoma os ajustes). Exportar em resolução total: JPEG 100%, HEIF 10-bit, TIFF 16-bit, preservando EXIF.

## Limitações conhecidas
- A abertura do iPhone é fixa: mostrada, não ajustável.
- RAW Bayer não existe em câmeras virtuais nem (em geral) na frontal; ProRAW exige iPhone 12 Pro ou superior. O app troca automaticamente para HEIF/JPEG e avisa.
- RAW Bayer é capturado em 12 MP (limite da API); 48 MP é via ProRAW/HEIF.
- Prioridade de ISO limita o obturador automático a 1/8 s para evitar tremido.
- O simulador não tem câmera: lá o app mostra aviso e abre a galeria; testes de captura exigem iPhone físico.
- A galeria lista as fotos feitas pelo app (identificadores locais).
