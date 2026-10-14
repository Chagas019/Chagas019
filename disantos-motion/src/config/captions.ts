import { seconds } from "./timeline";

// Legendas da narração. Os tempos devem bater com o arquivo de narração gravado
// (ver narracao/roteiro-narracao.md). Ficam na zona segura do Reels: entre o topo
// e a faixa inferior ocupada pela interface do aplicativo.
export type Caption = { from: number; to: number; text: string; kind: "narracao" };

export const NARRATION_CAPTIONS: Caption[] = [
  {
    from: seconds(3.3),
    to: seconds(8.1),
    text: "A fé atravessa gerações. A história dos santos continua viva em cada um de nós.",
    kind: "narracao",
  },
  {
    from: seconds(12.6),
    to: seconds(15.8),
    text: "É carregar consigo aquilo em que acreditamos.",
    kind: "narracao",
  },
];

// Janelas em que a narração está no ar. A trilha abaixa nesses trechos.
export const NARRATION_WINDOWS = NARRATION_CAPTIONS.map((c) => [c.from, c.to] as const);
