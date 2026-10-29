import type { Board, BoardCard } from './types';

export const DEFAULT_COLUMNS = [
  { id: 'col_fazer', title: 'A fazer' },
  { id: 'col_fazendo', title: 'Fazendo' },
  { id: 'col_revisao', title: 'Revisão' },
  { id: 'col_publicado', title: 'Publicado' },
];

export const DEFAULT_LABELS = [
  { id: 'lb_arte', name: 'Arte', color: '#FFC857' },
  { id: 'lb_foto', name: 'Fotos', color: '#5BFF9A' },
  { id: 'lb_video', name: 'Vídeo', color: '#55B8FF' },
  { id: 'lb_stories', name: 'Stories', color: '#B98BFF' },
  { id: 'lb_post', name: 'Post', color: '#FF8BD1' },
  { id: 'lb_live', name: 'Transmissão', color: '#FF6B6B' },
  { id: 'lb_urgente', name: 'Urgente', color: '#FF4D4D' },
];

export const emptyBoard = (): Board => ({ columns: DEFAULT_COLUMNS.map((c) => ({ ...c })), labels: DEFAULT_LABELS.map((l) => ({ ...l })), cards: [] });

/** Dados salvos antes do quadro existir (ou incompletos) ganham um quadro vazio. */
export function normalizeBoard(b?: Partial<Board> | null): Board {
  if (!b || !Array.isArray(b.columns) || !Array.isArray(b.cards)) return emptyBoard();
  return { columns: b.columns, cards: b.cards, labels: Array.isArray(b.labels) ? b.labels : DEFAULT_LABELS.map((l) => ({ ...l })) };
}

/** Move o cartão para a coluna, na posição `index` entre os cartões daquela coluna. */
export function moveCard(board: Board, cardId: string, columnId: string, index: number): Board {
  const card = board.cards.find((c) => c.id === cardId);
  if (!card) return board;
  const rest = board.cards.filter((c) => c.id !== cardId);
  const moved: BoardCard = { ...card, columnId };
  const inCol = rest.filter((c) => c.columnId === columnId);
  const clamped = Math.max(0, Math.min(index, inCol.length));
  // posição no array geral: antes do cartão que hoje ocupa `clamped` na coluna, ou depois do último
  let at: number;
  if (clamped < inCol.length) at = rest.indexOf(inCol[clamped]);
  else if (inCol.length) at = rest.indexOf(inCol[inCol.length - 1]) + 1;
  else at = rest.length;
  return { ...board, cards: [...rest.slice(0, at), moved, ...rest.slice(at)] };
}
