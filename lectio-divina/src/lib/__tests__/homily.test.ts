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

  it('quebra uma fala longa em frases curtas', () => {
    const t = 'Naquele tempo, 1Jesus começou a falar: “Tomai cuidado com o fermento dos fariseus, que é a hipocrisia. 2Não há nada de escondido que não venha a ser revelado, e não há nada de oculto que não venha a ser conhecido. 6No entanto, nenhum deles é esquecido por Deus. 7Até mesmo os cabelos de vossa cabeça estão todos contados. Não tenhais medo! Vós valeis mais do que muitos pardais”.';
    const f = frasesChave(t);
    expect(f).toHaveLength(3);
    expect(f).toContain('No entanto, nenhum deles é esquecido por Deus.');
    expect(f).toContain('Vós valeis mais do que muitos pardais');
    expect(f.every((x) => x.length <= 180)).toBe(true);
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

describe('homilia automática', () => {
  const l = {
    data: '2026-10-16',
    liturgia: '6ª feira da 28ª Semana do Tempo Comum',
    cor: 'Verde',
    primeiraLeitura: { referencia: 'Ef 1,11-14', titulo: '', texto: '' },
    salmo: { referencia: 'Sl 32(33)', titulo: '', texto: '', refrao: 'Feliz o povo que o Senhor escolheu por sua herança!' },
    segundaLeitura: null,
    evangelho: {
      referencia: 'Lc 12,1-7',
      titulo: '',
      texto: 'Naquele tempo, Jesus começou a falar: “Tomai cuidado com o fermento dos fariseus, que é a hipocrisia. 6No entanto, nenhum deles é esquecido por Deus. Vós valeis mais do que muitos pardais”.',
    },
  };

  it('escreve a homilia inteira com as leituras do dia', async () => {
    const { gerarHomilia } = await import('../homily');
    const h = gerarHomilia(l, '2026-10-16', 'sexta-feira');
    expect(h.paragrafos.length).toBeGreaterThanOrEqual(5);
    expect(h.texto).toContain('nesta sexta-feira');
    expect(h.texto).toContain('segundo Lucas');
    expect(h.texto).toContain('Lc 12,1-7');
    expect(h.texto).toContain('Ef 1,11-14');
    expect(h.texto).toContain('Feliz o povo que o Senhor escolheu por sua herança!');
    expect(h.texto).toContain('Tempo Comum');
    expect(h.texto.trim().endsWith('Amém.')).toBe(true);
    expect(h.texto).not.toMatch(/undefined|null|“”/);
  });

  it('é a mesma para o mesmo dia e muda de redação entre dias', async () => {
    const { gerarHomilia } = await import('../homily');
    expect(gerarHomilia(l, '2026-10-16', 'sexta-feira').texto).toBe(gerarHomilia(l, '2026-10-16', 'sexta-feira').texto);
    const textos = new Set(['2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19'].map((d) => gerarHomilia(l, d, 'sábado').paragrafos[0]));
    expect(textos.size).toBeGreaterThan(1);
  });

  it('fala de domingo quando é domingo', async () => {
    const { gerarHomilia } = await import('../homily');
    expect(gerarHomilia({ ...l, liturgia: '29º Domingo do Tempo Comum' }, '2026-10-18', 'domingo').texto).toContain('neste domingo, dia do Senhor');
  });
});
