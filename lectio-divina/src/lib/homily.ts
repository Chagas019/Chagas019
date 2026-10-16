// Monta, sozinho, um roteiro para preparar a homilia a partir da liturgia do dia.
// Nada é inventado sobre o texto: as frases destacadas são copiadas do próprio Evangelho,
// e as orientações são perguntas e passos gerais de pregação.
import type { Liturgia } from './lectio';

export type Evangelista = { nome: string; nota: string };

const EVANGELISTAS: Record<string, Evangelista> = {
  Mt: {
    nome: 'Mateus',
    nota: 'Escreve para uma comunidade de origem judaica e mostra Jesus como o cumprimento das promessas e o Mestre que ensina o caminho do Reino.',
  },
  Mc: {
    nome: 'Marcos',
    nota: 'É o Evangelho mais curto e direto: Jesus age, cura e chama ao seguimento, e aos poucos se revela como o Filho de Deus que serve.',
  },
  Lc: {
    nome: 'Lucas',
    nota: 'É o Evangelho da misericórdia: atenção aos pobres, aos pecadores e às mulheres, com Jesus muitas vezes em oração.',
  },
  Jo: {
    nome: 'João',
    nota: 'É o Evangelho dos sinais e dos longos discursos: Jesus é a Palavra feita carne, que dá a vida em abundância.',
  },
};

export function evangelista(referencia: string): Evangelista | null {
  const m = /^\s*(Mt|Mc|Lc|Jo)\b/.exec(referencia);
  return m ? EVANGELISTAS[m[1]] : null;
}

/** Tira os números de versículo grudados no texto ("5Tomadas de medo" → "Tomadas de medo"). */
export function semVersiculos(texto: string): string {
  return texto
    .replace(/\b\d+\s*,\s*\d+(?=\s*[A-Za-zÀ-ÿ“"‘])/g, '')
    .replace(/(^|[\s“"‘(])\d+(?=[A-Za-zÀ-ÿ“"‘])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Até 3 frases curtas das falas do Evangelho (entre aspas) para destacar; senão, as primeiras frases. */
export function frasesChave(texto: string, max = 3): string[] {
  const limpo = semVersiculos(texto.replace(/\n+/g, ' '));
  const frases = (t: string) => t.split(/(?<=[.!?])\s+/).map((f) => f.trim().replace(/^[—–-]\s*/, ''));
  // Uma fala pode ser longa (um discurso inteiro): quebra em frases e fica com as de tamanho bom.
  const falas = [...limpo.matchAll(/[“"]([^”"]+)[”"]/g)]
    .flatMap((m) => frases(m[1]))
    .filter((f) => f.length >= 25 && f.length <= 180 && f.split(' ').length >= 5);
  const unicas = [...new Set(falas)];
  if (unicas.length) {
    // Frases mais curtas costumam ser as mais fortes para uma homilia; mantém a ordem do texto.
    const escolhidas = [...unicas].sort((a, b) => a.length - b.length).slice(0, max);
    return unicas.filter((f) => escolhidas.includes(f));
  }
  return frases(limpo.replace(/^Naquele tempo,?\s*/i, ''))
    .filter((f) => f.length > 20)
    .slice(0, Math.min(2, max));
}

export type Tempo = { nome: string; dica: string };

export function tempoLiturgico(liturgia: string): Tempo | null {
  const l = liturgia.toLowerCase();
  if (l.includes('advento')) return { nome: 'Advento', dica: 'Tempo de espera e vigilância: ajude a assembleia a preparar o coração para o Senhor que vem.' };
  if (l.includes('natal') || l.includes('epifania')) return { nome: 'Natal', dica: 'Tempo do Deus que se fez próximo: destaque a alegria da encarnação.' };
  if (l.includes('cinzas') || l.includes('quaresma')) return { nome: 'Quaresma', dica: 'Tempo de conversão: oração, jejum e caridade como caminho para a Páscoa.' };
  if (l.includes('santa') && (l.includes('semana') || l.includes('quinta') || l.includes('sexta-feira da paixão'))) return { nome: 'Semana Santa', dica: 'O centro do ano: a paixão, morte e ressurreição do Senhor.' };
  if (l.includes('páscoa') || l.includes('pascal') || l.includes('pentecostes') || l.includes('ascensão')) return { nome: 'Páscoa', dica: 'Tempo da alegria do Ressuscitado: anuncie a vida nova e a presença do Espírito.' };
  if (l.includes('tempo comum')) return { nome: 'Tempo Comum', dica: 'Tempo de seguir Jesus no dia a dia: o que o Evangelho pede para a vida comum desta semana?' };
  return null;
}

export type Roteiro = {
  evangelista: Evangelista | null;
  tempo: Tempo | null;
  frases: string[];
  passos: { titulo: string; minutos: string; texto: string; perguntas: string[] }[];
  esboco: string;
};

export function montarRoteiro(l: Liturgia, dataLonga: string): Roteiro {
  const ev = evangelista(l.evangelho.referencia);
  const tempo = tempoLiturgico(l.liturgia);
  const frases = frasesChave(l.evangelho.texto);
  const frase = frases[0] ?? '';
  const refrao = l.salmo?.refrao ?? '';
  const nomeEv = ev ? `segundo ${ev.nome}` : '';

  const passos: Roteiro['passos'] = [
    {
      titulo: 'Abertura',
      minutos: '1 min',
      texto: frase
        ? `Comece por uma situação do dia a dia que ajude a entender a frase “${frase}”.`
        : 'Comece por uma situação do dia a dia que toque o tema do Evangelho.',
      perguntas: ['Que experiência comum das pessoas este Evangelho ilumina?', 'Que pergunta faria a assembleia prestar atenção logo no começo?'],
    },
    {
      titulo: 'O que o texto diz',
      minutos: '2 a 3 min',
      texto: `Explique o Evangelho ${nomeEv} (${l.evangelho.referencia}) com simplicidade: quem fala, com quem, onde, e o que acontece.${ev ? ` ${ev.nota}` : ''}`,
      perguntas: ['Qual é o centro da cena?', 'Que palavra ou gesto de Jesus muda tudo?'],
    },
    {
      titulo: 'A Palavra de hoje como um todo',
      minutos: '1 a 2 min',
      texto: [
        l.primeiraLeitura ? `Ligue o Evangelho à 1ª leitura (${l.primeiraLeitura.referencia})` : 'Ligue o Evangelho às outras leituras',
        refrao ? ` e ao refrão do salmo: “${refrao}”.` : '.',
        tempo ? ` ${tempo.dica}` : '',
      ].join(''),
      perguntas: ['O que as leituras têm em comum?', 'Como o tempo litúrgico ajuda a entender o texto?'],
    },
    {
      titulo: 'O que diz para nós hoje',
      minutos: '2 a 3 min',
      texto: 'Traga a mensagem para a vida concreta da comunidade: família, trabalho, sofrimentos e alegrias desta semana.',
      perguntas: ['Onde esta Palavra encontra a vida da minha comunidade?', 'O que ela consola? O que ela questiona?'],
    },
    {
      titulo: 'Convite e conclusão',
      minutos: '1 min',
      texto: 'Termine com um convite simples e concreto para viver durante a semana, e ligue com a Eucaristia que vai ser celebrada.',
      perguntas: ['Que gesto concreto posso propor?', 'Como esta Palavra nos leva ao altar?'],
    },
  ];

  const esboco = [
    `HOMILIA · ${dataLonga}`,
    l.liturgia && `${l.liturgia}${l.cor ? ` (${l.cor})` : ''}`,
    `Evangelho: ${l.evangelho.referencia}${l.primeiraLeitura ? ` · 1ª leitura: ${l.primeiraLeitura.referencia}` : ''}${l.salmo ? ` · Salmo: ${l.salmo.referencia}` : ''}`,
    frase && `Frase central: “${frase}”`,
    refrao && `Refrão do salmo: “${refrao}”`,
    '',
    ...passos.map((p, i) => `${i + 1}. ${p.titulo} (${p.minutos}): ${p.texto}`),
  ]
    .filter((x): x is string => typeof x === 'string')
    .join('\n');

  return { evangelista: ev, tempo, frases, passos, esboco };
}
