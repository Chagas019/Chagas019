import { describe, expect, it } from 'vitest';
import { htmlParaTexto, normalizeCnbb } from '../../../lib/cnbb.js';

// Resposta sintética montada a partir da estrutura descrita no scraper público
// (github.com/liturgiasaoperegrino-gif/montesenario); os textos são de teste.
const resposta = {
  content: {
    title: 'Liturgia Diária',
    color: 'verde',
    details: '<div style="font-size: 26px;">Sexta-feira da 28ª Semana do Tempo Comum</div>',
    leituras: '<div>Leituras:</div><div>Ef 1,11-14</div><div>Sl 32(33)</div><div></div><div>Lc 12,1-7</div>',
    body: [
      '<h3>PRIMEIRA LEITURA</h3><p>Leitura de teste A.</p>',
      '<div style="display: none;"><h3 class="title-leitura">metadado oculto</h3></div>',
      '<h3>Salmo responsorial</h3><p>R. Feliz o povo que o Senhor escolheu.</p><p>Estrofe de teste.</p>',
      '<h3>ACLAMAÇÃO AO EVANGELHO</h3><p>Aleluia de teste.</p>',
      '<h3>EVANGELHO</h3><p>Texto de teste do Evangelho &ndash; com “aspas”.</p><p>Segundo parágrafo.</p>',
    ].join(''),
  },
};

describe('CNBB', () => {
  it('converte HTML em texto sem os trechos ocultos', () => {
    expect(htmlParaTexto('<p>a&nbsp;b</p><div style="display:none">x</div><p>c</p>')).toBe('a b\nc');
  });

  it('extrai referências, textos, refrão e cor', () => {
    const l = normalizeCnbb(resposta, '2026-10-16');
    expect(l.liturgia).toBe('Sexta-feira da 28ª Semana do Tempo Comum');
    expect(l.cor).toBe('Verde');
    expect(l.primeiraLeitura?.referencia).toBe('Ef 1,11-14');
    expect(l.primeiraLeitura?.texto).toBe('Leitura de teste A.');
    expect(l.salmo?.refrao).toBe('Feliz o povo que o Senhor escolheu.');
    expect(l.salmo?.texto).not.toContain('metadado');
    expect(l.segundaLeitura).toBeNull();
    expect(l.evangelho.referencia).toBe('Lc 12,1-7');
    expect(l.evangelho.texto).toBe('Texto de teste do Evangelho – com “aspas”.\nSegundo parágrafo.');
  });

  it('recusa resposta sem Evangelho', () => {
    expect(() => normalizeCnbb({ content: { body: '<p>nada</p>' } }, '2026-10-16')).toThrow();
  });
});
