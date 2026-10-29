import { describe, expect, it } from 'vitest';
import { emptyBoard, moveCard, normalizeBoard } from './board';
import type { Board } from './types';

const card = (id: string, columnId: string) => ({ id, columnId, title: id, description: '', assigneeIds: [], labelIds: [], checklist: [], createdAt: '' });
const board = (): Board => ({ ...emptyBoard(), cards: [card('a', 'col_fazer'), card('b', 'col_fazer'), card('c', 'col_fazendo'), card('d', 'col_fazer')] });
const order = (b: Board, col: string) => b.cards.filter((c) => c.columnId === col).map((c) => c.id);

describe('quadro de tarefas', () => {
  it('move para outra coluna na posição certa', () => {
    const b = moveCard(board(), 'a', 'col_fazendo', 0);
    expect(order(b, 'col_fazendo')).toEqual(['a', 'c']);
    expect(order(b, 'col_fazer')).toEqual(['b', 'd']);
  });
  it('reordena dentro da coluna e aceita posição além do fim', () => {
    expect(order(moveCard(board(), 'a', 'col_fazer', 2), 'col_fazer')).toEqual(['b', 'd', 'a']);
    expect(order(moveCard(board(), 'd', 'col_fazer', 0), 'col_fazer')).toEqual(['d', 'a', 'b']);
    expect(order(moveCard(board(), 'b', 'col_revisao', Infinity), 'col_revisao')).toEqual(['b']);
  });
  it('dados antigos sem quadro ganham colunas e etiquetas padrão', () => {
    const b = normalizeBoard(undefined);
    expect(b.columns.map((c) => c.title)).toEqual(['A fazer', 'Fazendo', 'Revisão', 'Publicado']);
    expect(b.cards).toEqual([]);
    expect(normalizeBoard({ columns: [{ id: 'x', title: 'X' }], cards: [] }).labels.length).toBeGreaterThan(0);
  });
});
