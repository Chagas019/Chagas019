import { DEFAULT_BRAND, type Brand } from '../creative/brandDefaults.js';
import { DEFAULT_SETTINGS, type Settings } from '../db/settingsDefaults.js';

/**
 * Perfis prontos (marca + configurações editoriais). Aplicados no primeiro start via
 * SOCIAL_AI_PRESET ou pelo painel (Configurações → Perfil pronto).
 */
export interface Preset {
  key: string;
  label: string;
  brand: Partial<Brand>;
  settings: Partial<Settings>;
}

export const PRESETS: Record<string, Preset> = {
  fotografia_mobile: {
    key: 'fotografia_mobile',
    label: 'Fotografia mobile e criação de conteúdo',
    brand: { ...DEFAULT_BRAND },
    settings: {},
  },

  catolico: {
    key: 'catolico',
    label: 'Católico — evangelização (@chagas_catolico)',
    brand: {
      brand_name: 'Chagas Católico',
      handle: 'chagas_catolico',
      niche: 'Conteúdo católico e evangelização',
      audience: 'Católicos brasileiros que querem viver a fé no dia a dia, jovens e adultos, praticantes e afastados que estão voltando',
      tone: 'Acolhedor, reverente e próximo. Fala de fé com simplicidade e esperança, como um irmão na caminhada. Nada de julgamento, sensacionalismo ou medo; sempre fiel à doutrina da Igreja.',
      colors: { background: '#0E1726', surface: '#17243B', primary: '#C9A227', accent: '#E9D48A', text: '#FBF7EE', muted: '#BDB6A6' },
      fonts: { heading: 'DejaVu Serif', body: 'Inter', headingWeight: 700, bodyWeight: 500 },
      layout: { ...DEFAULT_BRAND.layout, margin: 100 },
      base_hashtags: ['catolico', 'fecatolica', 'igrejacatolica', 'evangelhododia'],
      forbidden_words: ['milagre garantido', 'oração infalível', 'corrente de oração', 'se não compartilhar'],
      rules: [
        'Fidelidade à Sagrada Escritura, à Tradição e ao Magistério da Igreja Católica.',
        'Citar sempre a referência bíblica exata (livro, capítulo e versículos). Nunca inventar versículos.',
        'Nunca atribuir frases a santos, ao Papa ou a documentos da Igreja sem ter certeza da fonte; na dúvida, não citar.',
        'Citar no máximo um versículo curto por post; não reproduzir leituras inteiras (direitos autorais da tradução).',
        'Sem política partidária, polêmicas ou ataques a outras religiões e denominações.',
        'Sem promessas de milagre, correntes ou chantagem emocional ("se não compartilhar...").',
        'Imagens: preferir símbolos (luz, velas, cruz, Bíblia, natureza, igrejas). Não gerar rostos de Jesus, Nossa Senhora ou santos por IA.',
      ],
    },
    settings: {
      routine: { trend_research: '04:30', trend_analysis: '05:00', strategy: '05:15', copywriting: '05:30', creative: '06:00', metrics: '22:30', weekly_report_weekday: 0 },
      publish_times: { reel: '19:00', feed: '07:30', stories: ['08:00', '12:00', '15:00', '18:00', '21:00'] },
      publish_window: { start: '07:00', end: '22:00' },
      trend_sources: {
        hashtags: ['catolicos', 'fecatolica', 'evangelhododia', 'santododia', 'igrejacatolica'],
        reference_accounts: [],
        web_search: true,
        web_topics: [
          'próximas festas, solenidades e memórias do calendário litúrgico',
          'notícias do Papa e da Igreja no Brasil (CNBB) das últimas 2 semanas',
          'formatos de conteúdo católico que mais engajam no Instagram (Reels de reflexão, carrosséis de catequese, oração)',
          'santos e devoções em destaque nesta época',
          'recursos novos do Instagram e Reels',
        ],
      },
      liturgy: { enabled: true, domains: ['liturgia.cancaonova.com', 'www.cnbb.org.br', 'www.vaticannews.va'] },
      story_pillars: ['liturgia_dia'],
      pillars: [
        { key: 'liturgia_dia', label: 'Evangelho / liturgia do dia', weight: 3, formats: ['REELS', 'IMAGE', 'CAROUSEL'] },
        { key: 'reflexao', label: 'Reflexão para a vida', weight: 3, formats: ['REELS', 'IMAGE'] },
        { key: 'santo_dia', label: 'Santo do dia', weight: 2, formats: ['CAROUSEL', 'IMAGE', 'REELS'] },
        { key: 'catequese', label: 'Catequese (doutrina explicada)', weight: 2, formats: ['CAROUSEL', 'REELS'] },
        { key: 'oracao', label: 'Oração', weight: 2, formats: ['IMAGE', 'REELS'] },
        { key: 'biblia', label: 'Bíblia explicada', weight: 2, formats: ['CAROUSEL', 'REELS'] },
        { key: 'tempo_liturgico', label: 'Tempo litúrgico e datas', weight: 1, formats: ['CAROUSEL', 'IMAGE'] },
        { key: 'devocao', label: 'Devoção (terço, Maria, sacramentos)', weight: 1, formats: ['REELS', 'CAROUSEL', 'IMAGE'] },
        { key: 'testemunho', label: 'Testemunho e vida cristã', weight: 1, formats: ['REELS', 'IMAGE'] },
        { key: 'interacao', label: 'Interação (pedidos de oração, perguntas)', weight: 1, formats: ['IMAGE', 'CAROUSEL'] },
      ],
    },
  },
};

export function presetSettings(key: string): Settings {
  const p = PRESETS[key] ?? PRESETS.fotografia_mobile;
  return { ...structuredClone(DEFAULT_SETTINGS), ...structuredClone(p.settings) } as Settings;
}
