# Chagas Color · FotoPreset

Editor de fotografia com presets autorais da marca **Chagas Color**. Feito com React 18,
TypeScript (modo estrito) e Vite. Todo o processamento acontece no aparelho: nenhuma foto é
enviada a servidores nem guardada.

## Como executar

Requisitos: Node.js 18 ou mais recente (testado com Node 22).

```bash
cd fotopreset
npm install
npm run dev        # http://localhost:5173
npm test           # testes unitários (Vitest)
npm run typecheck  # checagem de tipos
npm run build      # build de produção em dist/
npm run preview    # serve o build em http://localhost:4173
```

## O que o editor faz

- Importa fotos da galeria/computador (botão, arrastar e soltar ou colar com Ctrl+V).
  Valida tipo e tamanho e mostra erro claro para arquivos inválidos.
- Aplica presets em um clique, com intensidade de 0% a 100%.
- Ajustes manuais: exposição, contraste, realces, sombras, brancos, pretos, temperatura,
  matiz, vibração, saturação, esmaecer, vinheta e granulação. Somam-se ao preset.
- Comparação antes/depois com divisória arrastável (mouse, toque ou setas do teclado) e
  botão "segure para ver a original".
- Desfazer/refazer (até 100 passos; arrastar um mesmo controle conta como um passo) e
  restaurar a original — que também pode ser desfeito.
- Exporta JPG (qualidade 70–100%, padrão 95%) e PNG **na resolução original**. No celular,
  oferece "Salvar na galeria / compartilhar" pelo menu nativo de compartilhamento.
- Miniaturas reais de cada preset geradas sobre a própria foto, favoritos (salvos só como ids
  no `localStorage`) e filtro por categorias.
- Atalhos: `Ctrl/⌘+O` abrir, `Ctrl/⌘+Z` desfazer, `Ctrl/⌘+Shift+Z` ou `Ctrl+Y` refazer,
  `Ctrl/⌘+S` ir para exportar, `\` liga/desliga a comparação.

## Arquitetura

```
src/
  engine/
    adjustments.ts   tipos, intervalos, valores neutros e combinação preset + manual
    pipeline.ts      motor de pixels puro (sem DOM): tabelas de tons + cor por pixel
    history.ts       estado de edição e desfazer/refazer (reducer puro)
    core.ts          decodificação, prévia, miniaturas e exportação em faixas
    client.ts        API usada pela interface: Web Worker ou fallback na thread principal
  workers/           Web Worker e protocolo de mensagens
  presets/presets.ts presets autorais, categorias e validação
  services/          validação de arquivos, nomes, foto de exemplo e salvamento
  hooks/             useEditor (orquestra tudo) e useFavorites
  components/        interface (prévia, painéis, controles, marca)
```

### Decisões técnicas

- **Processamento real de pixels, não filtros CSS.** `pipeline.ts` trabalha direto no buffer
  RGBA. Exposição e balanço de branco são aplicados em luz linear; contraste, realces,
  sombras, brancos, pretos e esmaecer formam uma curva de tons. Como tudo isso depende só do
  valor de cada canal, vira três tabelas de 256 entradas calculadas uma vez por ajuste.
  Por pixel restam três consultas, saturação/vibração, divisão de tons, vinheta e granulação.
- **Original separada da edição.** A foto original fica guardada apenas como o arquivo
  compactado (`Blob`). O histórico guarda só parâmetros (alguns bytes por passo), nunca imagens.
- **Prévia leve, exportação completa.** A tela usa uma cópia reduzida (maior lado 1800 px).
  Na exportação a foto é decodificada na resolução total, processada em faixas de ~4 MP e a
  memória é liberada ao final. Teste real: foto de 6000×4000 (24 MP) exportada em ~2,5 s em
  Chromium, sem travar a interface.
- **Web Worker.** Decodificação, prévia, miniaturas e exportação rodam num Worker com
  `OffscreenCanvas`. Navegadores sem esse recurso usam a mesma lógica na thread principal,
  cedendo a vez entre as faixas. A prévia usa "o pedido mais recente vence" para não
  acumular trabalho enquanto um controle é arrastado.
- **Intensidade consistente.** A intensidade interpola os *parâmetros* do preset (0% =
  imagem idêntica à original, testado), em vez de misturar pixels; o resultado é o mesmo em
  qualquer resolução.
- **Presets extensíveis.** Cada preset tem `id`, `version`, nome, descrição, autor, categorias
  e só os parâmetros que diferem do neutro. `validatePreset` confere intervalos — base para
  importar presets no futuro.
- **Orientação EXIF** é respeitada ao abrir. Os metadados EXIF não são copiados para o
  arquivo exportado (privacidade; também evita expor localização).

### Sobre os presets

Os sete presets (Emaús, La Crème, Cinema, Luz Sagrada, Retrato, Moody, Editorial) são
autorais, definidos por parâmetros deste motor. **Não são conversões de presets do Lightroom**
e não há validação técnica de equivalência com o Lightroom; os nomes dos ajustes seguem a
convenção conhecida por fotógrafos, mas as curvas matemáticas são próprias. A temperatura é
uma aproximação perceptiva, não uma conversão calibrada em Kelvin.

## Testes

- `npm test` roda 31 testes unitários: conversões de cor, identidade com ajustes neutros,
  preservação do alfa, exposição (+1 EV dobra a luz linear), contraste, temperatura,
  saturação, sombras, realces, vinheta, granulação determinística, processamento em faixas
  idêntico ao processamento inteiro, intensidade 0% = original, efeito monotônico com a
  intensidade, validade dos presets, desfazer/refazer e validação de arquivos.
- Validação manual automatizada (Playwright/Chromium, fora do repositório): abrir arquivo
  inválido, foto de exemplo, presets, comparação, intensidade pelo teclado, desfazer/refazer,
  exportação JPG/PNG de 24 MP com dimensões conferidas, em 390×844 e 1440×900.

## Aplicativo para iPhone e Android (Capacitor)

O projeto já está preparado: `capacitor.config.ts` (appId `com.chagascolor.fotopreset`,
nome **Chagas Color**, `webDir: dist`), `@capacitor/core` e `@capacitor/cli` instalados e o
build usa caminhos relativos. **Os projetos nativos ainda não foram gerados nem compilados**
— isso exige as ferramentas abaixo e teste em aparelhos reais.

### Requisitos

- **Android:** Android Studio (Hedgehog ou mais novo), Android SDK 34, JDK 17.
- **iOS:** macOS com Xcode 15+, CocoaPods (`sudo gem install cocoapods`), conta Apple
  Developer para instalar em aparelho e publicar.

### Passos

```bash
npm install @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios
npm run cap:sync          # build + copia dist/ para os projetos nativos
npx cap open android      # ou: npx cap open ios
```

### Galeria e permissões (planejado)

- **Importar:** o `<input type="file" accept="image/*">` já abre o seletor de fotos do sistema
  dentro do WebView do Capacitor, sem permissão extra no Android 13+ (Photo Picker) nem no iOS
  (PHPicker). Para usar a câmera ou o seletor nativo, adicionar `@capacitor/camera`.
- **Salvar na galeria:** no navegador do celular o app usa o menu de compartilhamento
  ("Salvar imagem"). No app nativo, o plano é usar `@capacitor/filesystem` + `@capacitor/share`
  ou um plugin de mídia para gravar direto no álbum. Permissões necessárias:
  - iOS `Info.plist`: `NSPhotoLibraryAddUsageDescription` (salvar) e, se usar a câmera,
    `NSCameraUsageDescription` e `NSPhotoLibraryUsageDescription`.
  - Android: nenhuma para o Photo Picker; `WRITE_EXTERNAL_STORAGE` só para Android 9 ou
    anterior (`maxSdkVersion="28"`).
- **Limites de memória:** o Safari do iOS limita o tamanho de canvas; fotos muito grandes
  podem falhar na exportação e o app mostra o erro. Precisa ser medido em aparelhos reais.

## Pendente

- Gerar e testar os projetos nativos Android/iOS em aparelhos reais (permissões, memória,
  salvamento direto no álbum).
- Preservar metadados EXIF opcionalmente; suporte a HEIC fora do Safari (hoje depende do
  navegador conseguir decodificar).
- Recorte/rotação, máscaras locais, HSL por cor e curvas manuais.
- Importar/exportar presets do usuário (a validação já existe).
- A prévia é calculada em 8 bits por canal; ajustes extremos podem mostrar faixas em
  degradês.
