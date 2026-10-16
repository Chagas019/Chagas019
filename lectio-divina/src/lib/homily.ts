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

const CONECTIVOS = /^(sim|não,|portanto|pois|porque|então|e |mas |ora|no entanto|por isso|assim|que |quem )/i;
const FORTES = /\b(Deus|Pai|Reino|amor|amai|ama|vida|paz|misericórdia|medo|valeis|perdo|segue|segui|felizes|bem-aventurad|alegr|luz|fé|salva|coração|Senhor)/i;
const PESADAS = /\b(inferno|temei|ai de|hipócritas|condena)/i;

function pontuar(f: string, ultimaDaFala: boolean): number {
  let n = 0;
  if (FORTES.test(f)) n += 3;
  if (ultimaDaFala) n += 2;
  if (f.endsWith('!')) n += 1;
  if (CONECTIVOS.test(f)) n -= 3;
  if (PESADAS.test(f)) n -= 4;
  if (f.endsWith('?')) n -= 2;
  if (f.length > 120) n -= 1;
  return n;
}

const quebrarFrases = (t: string) =>
  t
    .split(/(?<=[.!?])\s+/)
    .map((f) => f.trim().replace(/^[—–-]\s*/, ''))
    .filter(Boolean);

// Quem fala antes das aspas é Jesus? ("Jesus disse:", "Jesus então lhes disse:", "disse Jesus:")
// "dizerem a Jesus:" não conta: ali Jesus é quem ouve.
const VERBOS = '(disse|diz|dizia|respondeu|responde|falou|falar|declarou|ensinava|ensinou|exclamou|perguntou|acrescentou|continuou)';
const FALA_DE_JESUS = new RegExp(`Jesus[^.:“”"]{0,80}\\b${VERBOS}|\\b${VERBOS}(-lhes)?,?\\s+Jesus\\b`, 'i');

const OUTRO_FALANTE = /\b(eles|elas|disseram|responderam|perguntaram|fariseus|escribas|discípulos|apóstolos|Pedro|povo|multidão|homem|mulher|anjo|Maria|João|soldados|centurião)\b/i;

type Candidata = { f: string; n: number; i: number };

function candidatas(limpo: string, soDeJesus: boolean): Candidata[] {
  const out: Candidata[] = [];
  let fimAnterior = 0;
  let anteriorDeJesus = false;
  for (const m of limpo.matchAll(/[“"]([^”"]+)[”"]/g)) {
    const antes = limpo.slice(fimAnterior, m.index);
    fimAnterior = (m.index ?? 0) + m[0].length;
    // "E acrescentou:" logo depois de uma fala de Jesus continua sendo Jesus, se ninguém mais entrou na cena.
    const continuacao: boolean = anteriorDeJesus && antes.length < 60 && !OUTRO_FALANTE.test(antes);
    anteriorDeJesus = FALA_DE_JESUS.test(antes) || continuacao;
    if (soDeJesus && !anteriorDeJesus) continue;
    // Uma fala pode ser longa (um discurso inteiro): quebra em frases e fica com as de tamanho bom.
    const fs = quebrarFrases(m[1]);
    fs.forEach((f, k) => {
      if (f.length >= 25 && f.length <= 180 && f.split(' ').length >= 5 && !out.some((c) => c.f === f)) {
        out.push({ f, n: pontuar(f, k === fs.length - 1), i: out.length });
      }
    });
  }
  return out;
}

/**
 * Frases do Evangelho, da mais forte para a menos forte. Prefere as falas de Jesus;
 * `deJesus` diz se as frases são mesmo dele (para a homilia não atribuir a Jesus a fala de outro).
 */
export function frasesRanqueadas(texto: string): { frases: string[]; deJesus: boolean } {
  const limpo = semVersiculos(texto.replace(/\n+/g, ' '));
  const ordenar = (cs: Candidata[]) => cs.sort((a, b) => b.n - a.n || a.f.length - b.f.length || a.i - b.i).map((c) => c.f);
  const deJesus = candidatas(limpo, true);
  if (deJesus.length) return { frases: ordenar(deJesus), deJesus: true };
  const outras = candidatas(limpo, false);
  if (outras.length) return { frases: ordenar(outras), deJesus: false };
  return {
    frases: quebrarFrases(limpo.replace(/^Naquele tempo,?\s*/i, '')).filter((f) => f.length > 20).slice(0, 2),
    deJesus: false,
  };
}

/** Até 3 frases para destacar, na ordem em que aparecem no Evangelho. */
export function frasesChave(texto: string, max = 3): string[] {
  const top = frasesRanqueadas(texto).frases.slice(0, max);
  const limpo = semVersiculos(texto.replace(/\n+/g, ' '));
  return top.sort((a, b) => limpo.indexOf(a) - limpo.indexOf(b));
}

const NOVO_TESTAMENTO = /^\s*(At|Rm|[12]\s?Cor|Gl|Ef|Fl|Cl|[12]\s?Ts|[12]\s?Tm|Tt|Fm|Hb|Tg|[12]\s?Pd|[123]\s?Jo|Jd|Ap)\b/;
export const doNovoTestamento = (ref: string) => NOVO_TESTAMENTO.test(ref);

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
  const frase = frasesRanqueadas(l.evangelho.texto).frases[0] ?? '';
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

// ---------------------------------------------------------------------------
// Homilia completa, escrita automaticamente a partir das leituras do dia.
// O texto junta frases copiadas do Evangelho e do salmo com reflexões gerais e
// seguras (sem inventar fatos sobre o texto). A variação de frases é sorteada pela
// data, então cada dia tem uma redação diferente, mas sempre a mesma para aquele dia.

export type Homilia = { titulo: string; paragrafos: string[]; texto: string };

const PALAVRA_DO_EVANGELISTA: Record<string, string> = {
  Mateus: 'Mateus gosta de mostrar Jesus como o Mestre que cumpre as promessas de Deus e ensina o caminho do Reino. Ele não fala de longe: fala para quem quer de verdade ser discípulo.',
  Marcos: 'Marcos conta tudo com pressa, como quem não quer perder tempo: Jesus passa, age, cura e chama. E, ao mesmo tempo, vai revelando quem Ele é: o Filho de Deus que veio para servir.',
  Lucas: 'Lucas é chamado o evangelista da misericórdia. No seu Evangelho, Jesus tem um olhar especial para os pobres, para os pecadores, para os que ninguém vê, e muitas vezes aparece rezando ao Pai.',
  João: 'João escreve como quem contempla. Cada gesto de Jesus é um sinal, cada palavra abre uma janela para o mistério: Ele é a Palavra feita carne, que veio para que tenhamos vida em abundância.',
};

const TEMPO_NA_HOMILIA: Record<string, string> = {
  Advento: 'Estamos no Advento, tempo de espera e de vigilância. A Igreja nos convida a preparar o coração, porque o Senhor vem, e vem para ficar.',
  Natal: 'Estamos no tempo do Natal, quando contemplamos um Deus que não ficou distante, mas se fez criança, se fez próximo, se fez um de nós.',
  Quaresma: 'Estamos na Quaresma, caminho de conversão rumo à Páscoa. Oração, jejum e caridade não são peso: são o jeito de abrir espaço para Deus.',
  'Semana Santa': 'Estamos na Semana Santa, o coração do ano litúrgico. Tudo o que ouvimos hoje nos aproxima da cruz e da ressurreição do Senhor.',
  Páscoa: 'Estamos no tempo pascal, tempo da alegria do Ressuscitado. Cristo está vivo, e cada Palavra que ouvimos agora tem o brilho da manhã da Páscoa.',
  'Tempo Comum': 'Estamos no Tempo Comum, e isso não quer dizer tempo sem importância: é o tempo de seguir Jesus no dia a dia, no trabalho, em casa, nas coisas simples.',
};

const ABERTURAS = [
  (quando: string, ev: string, f: string) => `Irmãos e irmãs, ${quando} o Evangelho${ev} nos coloca diante de uma palavra que merece ficar no nosso coração: “${f}”.`,
  (quando: string, ev: string, f: string) => `Meus irmãos, ${quando} o Senhor nos fala no Evangelho${ev}, e uma frase se destaca, como se fosse dita para cada um de nós: “${f}”.`,
  (quando: string, ev: string, f: string) => `Queridos irmãos e irmãs, ${quando} a Palavra de Deus chega até nós pelo Evangelho${ev}. Guardemos especialmente esta palavra: “${f}”.`,
];

const ATUALIZACOES = [
  'Esta Palavra não foi escrita só para quem estava ali com Jesus. Ela é para nós, hoje. Pensemos na nossa casa, no nosso trabalho, nas pessoas com quem convivemos: onde precisamos ouvir isso de novo? Talvez numa relação que esfriou, numa preocupação que tira o nosso sono, numa decisão que estamos adiando.',
  'É fácil ouvir o Evangelho e achar que ele fala dos outros. Mas Jesus olha para nós. Ele conhece o nosso cansaço, as nossas lutas, as nossas alegrias e as nossas quedas. E é justamente aí, na vida como ela é, que a sua Palavra quer entrar e transformar.',
  'Quantas vezes vivemos correndo, cheios de compromissos, e a Palavra de Deus fica para depois. Hoje o Senhor nos para no caminho. Ele não quer só ser ouvido: quer ser acolhido, quer mudar alguma coisa concreta em nós, em nossa família, em nossa comunidade.',
];

const CONVITES = [
  'Por isso, levemos daqui um propósito simples: escolher um gesto concreto, nesta semana, que mostre que esta Palavra entrou em nós. Uma reconciliação, uma visita, uma oração mais fiel, um perdão que estava guardado.',
  'Que tal sairmos daqui com um compromisso pequeno, mas verdadeiro? Repetir esta frase do Evangelho ao acordar, e deixar que ela guie as nossas escolhas durante o dia.',
  'Peçamos ao Senhor a coragem de não deixar esta Palavra só nos ouvidos. Que ela desça ao coração e chegue às mãos, em gestos de amor, de paciência e de serviço a quem mais precisa.',
];

const CONCLUSOES = [
  'E agora, ao redor do altar, o mesmo Senhor que nos falou na Palavra se entrega a nós no Pão da Eucaristia. Que Ele nos dê a graça de viver o que ouvimos. Amém.',
  'Que Nossa Senhora, que guardava todas as coisas no coração, nos ensine a guardar e a viver esta Palavra. E que a Eucaristia que vamos celebrar nos dê força para isso. Amém.',
  'Continuemos esta celebração com o coração aberto. O Cristo que nos falou agora vai se fazer alimento para nós. Que Ele nos transforme naquilo que recebemos. Amém.',
];

function semente(iso: string): number {
  let h = 0;
  for (const c of iso) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

const sortear = <T,>(lista: T[], seed: number, salto: number) => lista[(seed + salto) % lista.length];

const fecharFrase = (f: string) => (/[.!?…]$/.test(f) ? f : `${f}.`);

/** Escreve a homilia do dia, pronta para ler ou rezar, a partir das leituras. */
export function gerarHomilia(l: Liturgia, iso: string, diaDaSemana: string): Homilia {
  const seed = semente(iso);
  const ev = evangelista(l.evangelho.referencia);
  const tempo = tempoLiturgico(l.liturgia);
  const { frases: ranqueadas, deJesus } = frasesRanqueadas(l.evangelho.texto);
  const central = ranqueadas[0] ?? 'Segue-me';
  const outras = frasesChave(l.evangelho.texto).filter((f) => f !== central).slice(0, 2);
  const refrao = l.salmo?.refrao ?? '';
  const domingo = /domingo/i.test(l.liturgia) || diaDaSemana === 'domingo';
  const quando = domingo ? 'neste domingo, dia do Senhor,' : `nesta ${diaDaSemana},`;
  const evTxt = ev ? ` segundo ${ev.nome}` : '';

  const p: string[] = [];

  // 1. Abertura
  p.push(
    [sortear(ABERTURAS, seed, 0)(quando, evTxt, fecharFrase(central).replace(/\.$/, '')), tempo ? TEMPO_NA_HOMILIA[tempo.nome] : '']
      .filter(Boolean)
      .join(' '),
  );

  // 2. O texto
  const texto2 = [
    ev ? PALAVRA_DO_EVANGELISTA[ev.nome] : '',
    deJesus
      ? `No trecho de hoje (${l.evangelho.referencia}), Jesus não fala por falar.`
      : `O trecho de hoje (${l.evangelho.referencia}) merece ser lido com calma.`,
    outras.length === 1 ? `${deJesus ? 'Ele diz' : 'O texto diz'} também: “${fecharFrase(outras[0])}”` : '',
    outras.length >= 2 ? `${deJesus ? 'Ele diz' : 'O texto diz'} também: “${fecharFrase(outras[0])}” E ainda: “${fecharFrase(outras[1])}”` : '',
    'Cada uma dessas palavras revela o coração de Deus, que nos conhece, nos chama e nos quer inteiros.',
  ];
  p.push(texto2.filter(Boolean).join(' '));

  // 3. As leituras juntas
  if (l.primeiraLeitura || refrao) {
    p.push(
      [
        l.primeiraLeitura
          ? doNovoTestamento(l.primeiraLeitura.referencia)
            ? `A primeira leitura (${l.primeiraLeitura.referencia}), dos escritos dos apóstolos, mostra como a Igreja nascente acolheu e viveu este mesmo Evangelho.`
            : `A primeira leitura (${l.primeiraLeitura.referencia}) caminha junto com este Evangelho: a Palavra de Deus é uma só, e o Antigo e o Novo Testamento se iluminam um ao outro.`
          : '',
        l.segundaLeitura ? `E a segunda leitura (${l.segundaLeitura.referencia}) nos ajuda a ver como os primeiros cristãos viveram esta mesma fé.` : '',
        refrao ? `Por isso, com o salmista, rezamos de coração: “${fecharFrase(refrao)}”` : '',
      ]
        .filter(Boolean)
        .join(' '),
    );
  }

  // 4. Para hoje
  p.push(`${sortear(ATUALIZACOES, seed, 1)} ${deJesus ? 'Hoje o Senhor nos repete' : 'Guardemos hoje esta Palavra'}: “${fecharFrase(central)}”`);

  // 5. Convite e conclusão
  p.push(sortear(CONVITES, seed, 2));
  p.push(sortear(CONCLUSOES, seed, 0));

  const titulo = fecharFrase(central).replace(/\.$/, '');
  return { titulo, paragrafos: p, texto: [titulo.toUpperCase(), ...p].join('\n\n') };
}
