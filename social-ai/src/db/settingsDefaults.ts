export type Format = 'REELS' | 'CAROUSEL' | 'IMAGE' | 'STORIES';
export interface PillarSetting { key: string; label: string; weight: number; formats?: Format[] }

/** Configurações operacionais editáveis no painel. */
export const DEFAULT_SETTINGS = {
  /** Modo de produção: só pode ser ligado após conectar conta + confirmar permissões. */
  production_mode: false,
  /** Botão de emergência — pausa TODAS as publicações imediatamente. */
  publishing_paused: false,
  /** Se true, conteúdos aprovados pelo QA ainda exigem aprovação humana antes de agendar. */
  require_human_approval: true,

  timezone: 'America/Sao_Paulo',
  routine: {
    trend_research: '06:00',
    trend_analysis: '07:00',
    strategy: '08:00',
    copywriting: '09:00',
    creative: '10:00',
    metrics: '22:00',
    weekly_report_weekday: 0, // domingo
  },
  frequency: {
    reels_per_day: 1,
    feed_per_day: 1, // alterna carrossel / imagem
    stories_min: 3,
    stories_max: 5,
  },
  publish_times: {
    reel: '18:30',
    feed: '12:00',
    stories: ['11:00', '13:30', '17:00', '20:00', '21:30'],
  },
  publish_window: { start: '08:00', end: '22:30' },
  quality: { min_score: 80 },
  retries: { max_attempts: 3, backoff_minutes: [2, 10, 30] },
  trend_sources: {
    hashtags: ['fotografiamobile', 'fotografiacomcelular', 'edicaodefotos', 'criacaodeconteudo', 'reelsbrasil'],
    reference_accounts: [] as string[],
    web_search: true,
    web_topics: ['fotografia mobile', 'apps de edição de foto e vídeo', 'recursos novos do Instagram e Reels', 'tendências de edição', 'formatos de conteúdo em alta no Brasil'],
  },
  /** Liturgia diária (perfis católicos): referências buscadas em fontes oficiais via pesquisa web. */
  liturgy: { enabled: false, domains: [] as string[] },
  /** Pilares que se alternam nos Stories diários. */
  story_pillars: ['interacao', 'bastidores', 'dica_rapida'],
  pillars: [
    { key: 'reel_educativo', label: 'Reels educativos', weight: 3 },
    { key: 'tutorial', label: 'Tutoriais', weight: 3 },
    { key: 'carrossel', label: 'Carrosséis', weight: 2 },
    { key: 'dica_rapida', label: 'Dicas rápidas', weight: 2 },
    { key: 'bastidores', label: 'Bastidores', weight: 1 },
    { key: 'fotografia', label: 'Fotografia', weight: 2 },
    { key: 'aplicativos', label: 'Aplicativos', weight: 2 },
    { key: 'tendencias', label: 'Tendências', weight: 2 },
    { key: 'autoridade', label: 'Conteúdos de autoridade', weight: 1 },
    { key: 'interacao', label: 'Conteúdos de interação', weight: 1 },
  ] as PillarSetting[],
  publishing_rules: {
    max_hashtags: 15,
    max_caption_length: 2200,
    min_hours_between_feed_posts: 3,
    blocked_terms: [] as string[],
  },
};

export type Settings = typeof DEFAULT_SETTINGS;
