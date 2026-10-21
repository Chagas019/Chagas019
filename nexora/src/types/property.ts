/** Modelo de domínio da plataforma. Espelha as tabelas em supabase/migrations. */

export type PropertyType = 'casa' | 'apartamento' | 'casa-condominio' | 'studio' | 'terreno' | 'comercial' | 'cobertura';
export type Purpose = 'venda' | 'aluguel';
export type PublicationStatus = 'publicado' | 'rascunho' | 'arquivado';
/** "Recém-adicionado" não é etiqueta fixa: é calculado pela data de cadastro (ver isNew) */
export type PropertyTag = 'lancamento' | 'exclusivo';

export interface Media {
  src: string;
  /** Versão menor (≈800 px de largura) para cards e srcset */
  thumb?: string;
  alt: string;
  width: number;
  height: number;
  /** Ambiente ao qual a foto pertence (id do cômodo), quando houver */
  roomId?: string;
  /** Crédito ou observação (ex.: "Render demonstrativo") */
  caption?: string;
}

/* ---------- Planta baixa (geometria em metros, origem no canto superior esquerdo) ---------- */
export type Point = [number, number];

export interface PlanRoom {
  id: string;
  name: string;
  /** Polígono do ambiente, em metros */
  polygon: Point[];
  /** Área declarada em m² (se ausente, é calculada pelo polígono) */
  area?: number;
  kind: RoomKind;
  description?: string;
  features?: string[];
  /** Pé-direito em metros, quando conhecido */
  ceiling?: number;
  /** Lados externos totalmente abertos (n = topo da planta, s = fundo, w = esquerda, e = direita) */
  openSides?: Side[];
  /** Lados externos que devem ser paredes cegas */
  solidSides?: Side[];
}

export type Side = 'n' | 's' | 'e' | 'w';

export type RoomKind =
  | 'sala' | 'cozinha' | 'suite' | 'quarto' | 'banheiro' | 'gourmet' | 'piscina' | 'jardim'
  | 'garagem' | 'circulacao' | 'servico' | 'escritorio' | 'varanda' | 'loja' | 'deposito' | 'lote';

export type FurnitureKind =
  | 'sofa' | 'poltrona' | 'mesa-centro' | 'tapete' | 'cama' | 'criado' | 'mesa' | 'cadeira' | 'bancada' | 'ilha'
  | 'banheira' | 'vaso' | 'pia' | 'chuveiro' | 'carro' | 'arvore' | 'arbusto' | 'espreguicadeira' | 'armario'
  | 'escada' | 'balcao' | 'estante' | 'churrasqueira';

/** Mobiliário ilustrativo. Posição = centro do objeto, tamanho em metros (largura × profundidade). */
export interface PlanFurniture { kind: FurnitureKind; at: Point; size: [number, number]; rotation?: number; roomId?: string }

export interface PlanLevel {
  id: string;
  name: string;
  /** Altura do piso em metros (0 = térreo) */
  elevation: number;
  width: number;
  depth: number;
  /** Altura entre piso e teto em metros */
  height: number;
  rooms: PlanRoom[];
  /** Mobiliário ilustrativo. Se ausente, é distribuído automaticamente pelo tipo de cada ambiente. */
  furniture?: PlanFurniture[];
  /** Escada (retângulo em metros), quando houver outro pavimento */
  stairs?: { x: number; y: number; w: number; d: number; dir: Side };
}

export interface VectorFloorPlan {
  kind: 'vetorial';
  levels: PlanLevel[];
  /** Origem do desenho (ex.: "Planta ilustrativa de demonstração") */
  source: string;
}

/** Quando só existe uma imagem: zoom e marcadores sobre ela, sem geometria. */
export interface ImageFloorPlan {
  kind: 'imagem';
  levels: { id: string; name: string; image: Media; hotspots: { roomId: string; name: string; x: number; y: number; area?: number }[] }[];
  source: string;
}

export type FloorPlan = VectorFloorPlan | ImageFloorPlan;

/* ---------- 3D ---------- */
export interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
}

export interface Model3D {
  /** URL de um arquivo .glb/.gltf */
  url: string;
  /** true quando o modelo é ilustrativo (gerado a partir da planta), não um levantamento do imóvel */
  demonstrative: boolean;
  /** Vista inicial */
  initialView: CameraPreset;
  /** Posições de câmera por ambiente — devem usar os mesmos ids da planta para sincronizar */
  rooms: Record<string, CameraPreset & { label: string; interior: boolean; level?: string }>;
  hasNightLighting: boolean;
  /** Tamanho aproximado em MB (exibido antes de carregar) */
  sizeMb?: number;
  credits?: string;
}

export interface Panorama {
  roomId: string;
  name: string;
  /** Imagem equirretangular 2:1 */
  src: string;
  demonstrative: boolean;
  /** Posição da câmera no modelo (m), usada para orientar as setas de navegação */
  position: [number, number, number];
  links: { to: string; yaw: number; pitch: number }[];
}

export interface Property {
  id: string;
  slug: string;
  name: string;
  type: PropertyType;
  purpose: Purpose;
  price: number;
  /** Condomínio mensal (R$). undefined = não se aplica/não informado */
  condoFee?: number;
  /** IPTU anual (R$) */
  iptu?: number;
  city: string;
  neighborhood: string;
  state: string;
  /** Coordenadas aproximadas — nunca o endereço exato. Ausentes nos imóveis de demonstração. */
  approxLocation?: { lat: number; lng: number; radiusM: number };
  builtArea?: number;
  landArea?: number;
  bedrooms: number;
  suites: number;
  bathrooms: number;
  parking: number;
  headline: string;
  description: string;
  internalFeatures: string[];
  externalFeatures: string[];
  tags: PropertyTag[];
  lifestyle: LifestyleId[];
  featured: boolean;
  status: PublicationStatus;
  /** Imóvel fictício usado para demonstrar a plataforma */
  demo: boolean;
  cover: Media;
  gallery: Media[];
  video?: { src: string; poster?: string; caption: string };
  floorPlan?: FloorPlan;
  model3d?: Model3D;
  panoramas?: Panorama[];
  documents?: { label: string; value: string }[];
  /** Documentos técnicos só aparecem se autorizados pelo proprietário */
  documentsAuthorized: boolean;
  architect?: string;
  yearBuilt?: number;
  createdAt: string;
  updatedAt: string;
  seo?: { title?: string; description?: string };
}

export type LifestyleId = 'contemporaneas' | 'alto-padrao' | 'piscina' | 'compactos' | 'condominio' | 'terrenos' | 'comerciais';

export interface Lead {
  id: string;
  kind: 'informacoes' | 'visita' | 'contato';
  name: string;
  email: string;
  phone?: string;
  message?: string;
  propertyId?: string;
  propertyName?: string;
  /** Data/hora desejada para a visita (ISO) */
  visitAt?: string;
  visitMode?: 'presencial' | 'video';
  source: string;
  status: 'novo' | 'em-atendimento' | 'visita-agendada' | 'concluido' | 'descartado';
  consent: boolean;
  createdAt: string;
  notes?: string;
}
