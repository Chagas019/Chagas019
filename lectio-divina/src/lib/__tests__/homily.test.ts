import { describe, expect, it } from 'vitest';
import { evangelista, frasesChave, montarRoteiro, semVersiculos, tempoLiturgico } from '../homily';

describe('roteiro da homilia', () => {
  it('reconhece o evangelista pela referência', () => {
    expect(evangelista('Lc 12,1-7')?.nome).toBe('Lucas');
    expect(evangelista('Jo 3,16')?.nome).toBe('João');
    expect(evangelista('Ef 1,3')).toBeNull();
  });

  it('tira números de versículo', () => {
    expect(semVersiculos('1No primeiro dia, 2Elas encontraram')).toBe('No primeiro dia, Elas encontraram');
  });

  it('destaca falas entre aspas, copiadas do texto', () => {
    const t = 'Naquele tempo, 5Jesus disse: “Não tenhais medo daqueles que matam o corpo e não podem matar a alma.” 6E também: “Até os cabelos da vossa cabeça estão todos contados.”';
    const f = frasesChave(t);
    expect(f).toContain('Até os cabelos da vossa cabeça estão todos contados.');
    expect(f.every((x) => t.includes(x.slice(0, 15)) || semVersiculos(t).includes(x))).toBe(true);
  });

  it('sem aspas, usa as primeiras frases', () => {
    expect(frasesChave('Naquele tempo, Jesus subiu ao monte para rezar sozinho. Depois desceu.')[0]).toBe(
      'Jesus subiu ao monte para rezar sozinho.',
    );
  });

  it('identifica o tempo litúrgico', () => {
    expect(tempoLiturgico('Sexta-feira da 28ª Semana do Tempo Comum')?.nome).toBe('Tempo Comum');
    expect(tempoLiturgico('2º Domingo do Advento')?.nome).toBe('Advento');
    expect(tempoLiturgico('')).toBeNull();
  });

  it('monta o esboço com os dados do dia', () => {
    const r = montarRoteiro(
      {
        data: '2026-10-16',
        liturgia: 'Sexta-feira da 28ª Semana do Tempo Comum',
        cor: 'Verde',
        primeiraLeitura: { referencia: 'Ef 1,11-14', titulo: '', texto: '' },
        salmo: { referencia: 'Sl 32', titulo: '', texto: '', refrao: 'Feliz o povo que o Senhor escolheu.' },
        segundaLeitura: null,
        evangelho: { referencia: 'Lc 12,1-7', titulo: '', texto: 'Jesus disse: “Não tenhais medo, valeis mais do que muitos pardais.”' },
      },
      'sexta-feira, 16 de outubro de 2026',
    );
    expect(r.passos).toHaveLength(5);
    expect(r.esboco).toContain('Evangelho: Lc 12,1-7');
    expect(r.esboco).toContain('Frase central: “Não tenhais medo, valeis mais do que muitos pardais.”');
    expect(r.esboco).toContain('Feliz o povo que o Senhor escolheu.');
    expect(r.passos[1].texto).toContain('segundo Lucas');
  });
});
