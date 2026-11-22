/**
 * Plantas ilustrativas dos imóveis de demonstração (medidas em metros).
 * Cada planta guarda somente os ambientes; paredes, portas, vidros e mobiliário saem de src/lib/plan.ts.
 * Os mesmos ids de ambiente são usados no modelo 3D, nas fotos e nos panoramas para manter tudo sincronizado.
 */
import type { PlanLevel, VectorFloorPlan } from '@/types/property';
import { rect } from '../lib/plan';

const SOURCE = 'Planta ilustrativa criada para a demonstração da plataforma. Não representa um projeto aprovado.';

export const planCasaHorizonte: VectorFloorPlan = {
  kind: 'vetorial',
  source: SOURCE,
  levels: [
    {
      id: 'terreo',
      name: 'Térreo',
      elevation: 0,
      height: 3,
      width: 30,
      depth: 22,
      stairs: { x: 8.6, y: 5.2, w: 1.2, d: 3.8, dir: 's' },
      rooms: [
        { id: 'garagem', name: 'Garagem', kind: 'garagem', polygon: rect(0, 2, 6, 6), openSides: ['n'], description: 'Garagem coberta sob o volume em balanço do pavimento superior, com acesso direto ao hall.', features: ['2 vagas cobertas', 'Ponto para carregador de veículo elétrico'] },
        { id: 'hall', name: 'Hall de entrada', kind: 'circulacao', polygon: rect(6, 2, 4, 7), description: 'Hall com pé-direito simples e escada em lâmina que conecta os dois pavimentos.', features: ['Escada com degraus em balanço', 'Armário para casacos'] },
        { id: 'lavabo', name: 'Lavabo', kind: 'banheiro', polygon: rect(6, 9, 4, 3), description: 'Lavabo social próximo às áreas de convívio.', features: ['Bancada em pedra', 'Ventilação natural'] },
        { id: 'cozinha', name: 'Cozinha', kind: 'cozinha', polygon: rect(10, 2, 6, 5), description: 'Cozinha integrada à sala, com ilha central e bancada contínua.', features: ['Ilha com cooktop', 'Integração com a sala de estar', 'Despensa'] },
        { id: 'sala', name: 'Sala de estar e jantar', kind: 'sala', polygon: [[16, 2], [22, 2], [22, 12], [10, 12], [10, 7], [16, 7]], ceiling: 3, description: 'Estar e jantar em L, com fachadas de vidro voltadas para a piscina e o jardim.', features: ['Esquadrias de piso a teto', 'Integração com a área gourmet', 'Iluminação indireta'] },
        { id: 'gourmet', name: 'Área gourmet', kind: 'gourmet', polygon: rect(22, 4, 6, 8), description: 'Varanda coberta com churrasqueira e mesa para dez pessoas, aberta para a piscina.', features: ['Churrasqueira', 'Laje de cobertura com beiral', 'Acesso à piscina'] },
        { id: 'piscina', name: 'Piscina', kind: 'piscina', polygon: rect(12, 14.5, 14, 4), description: 'Piscina de raia com borda em pedra e deck lateral.', features: ['14 × 4 m', 'Deck em madeira', 'Iluminação subaquática'] },
        { id: 'jardim', name: 'Jardim', kind: 'jardim', polygon: rect(0, 12.5, 11, 9.5), description: 'Jardim com árvores de médio porte e gramado nos fundos do lote.', features: ['Paisagismo com espécies nativas', 'Irrigação automatizada'] },
      ],
    },
    {
      id: 'superior',
      name: 'Pavimento superior',
      elevation: 3.2,
      height: 3,
      width: 30,
      depth: 22,
      stairs: { x: 8.6, y: 5.2, w: 1.2, d: 3.8, dir: 'n' },
      rooms: [
        { id: 'quarto-1', name: 'Quarto 1', kind: 'quarto', polygon: rect(4, 0, 6, 5), description: 'Dormitório voltado para a frente do lote, com armário embutido.', features: ['Armário embutido', 'Esquadria com brise'] },
        { id: 'quarto-2', name: 'Quarto 2', kind: 'quarto', polygon: rect(10, 0, 6, 5), description: 'Dormitório com boa iluminação natural.', features: ['Armário embutido', 'Esquadria com brise'] },
        { id: 'suite', name: 'Suíte principal', kind: 'suite', polygon: rect(16, 0, 8, 7), description: 'Suíte na extremidade do volume em balanço, com vista para a piscina.', features: ['Closet', 'Banheiro com duas cubas', 'Vista para a área de lazer'] },
        { id: 'closet', name: 'Closet', kind: 'servico', polygon: rect(16, 7, 4, 4) },
        { id: 'banho-suite', name: 'Banho da suíte', kind: 'banheiro', polygon: rect(20, 7, 4, 4), description: 'Banheiro da suíte com chuveiro amplo e bancada dupla.', features: ['Bancada dupla', 'Chuveiro de teto'] },
        { id: 'banheiro', name: 'Banheiro', kind: 'banheiro', polygon: rect(4, 5, 4, 6), description: 'Banheiro compartilhado pelos quartos.', features: ['Box amplo', 'Ventilação natural'] },
        { id: 'estar-intimo', name: 'Estar íntimo', kind: 'escritorio', polygon: rect(8, 5, 8, 6), description: 'Estar íntimo e escritório no topo da escada.', features: ['Espaço para home office', 'Estante embutida'] },
      ],
    },
  ],
};

export const planApartamentoMirante: VectorFloorPlan = {
  kind: 'vetorial',
  source: SOURCE,
  levels: [
    {
      id: 'unidade',
      name: 'Unidade',
      elevation: 0,
      height: 2.9,
      width: 18,
      depth: 13.5,
      rooms: [
        { id: 'varanda', name: 'Varanda gourmet', kind: 'gourmet', polygon: rect(0, 0, 10, 2.5), description: 'Varanda gourmet com fechamento em vidro e churrasqueira.', features: ['Churrasqueira', 'Guarda-corpo de vidro'] },
        { id: 'sala', name: 'Sala de estar e jantar', kind: 'sala', polygon: rect(0, 2.5, 10, 5.5), description: 'Estar e jantar integrados à varanda.', features: ['Piso em porcelanato', 'Integração com a varanda'] },
        { id: 'cozinha', name: 'Cozinha', kind: 'cozinha', polygon: rect(10, 2.5, 8, 3.5), description: 'Cozinha com bancada em L e ilha.', features: ['Ilha', 'Coifa'] },
        { id: 'servico', name: 'Área de serviço', kind: 'servico', polygon: rect(10, 6, 4, 2) },
        { id: 'lavabo', name: 'Lavabo', kind: 'banheiro', polygon: rect(14, 6, 4, 2), description: 'Lavabo social.' },
        { id: 'circulacao', name: 'Circulação', kind: 'circulacao', polygon: rect(5, 8, 13, 1.5) },
        { id: 'suite', name: 'Suíte principal', kind: 'suite', polygon: rect(0, 8, 5, 5.5), description: 'Suíte com closet e banheiro.', features: ['Closet', 'Persiana automatizada'] },
        { id: 'banho-suite', name: 'Banho da suíte', kind: 'banheiro', polygon: rect(5, 9.5, 3, 4) },
        { id: 'quarto-1', name: 'Quarto 1', kind: 'quarto', polygon: rect(8, 9.5, 3.5, 4) },
        { id: 'banheiro', name: 'Banheiro', kind: 'banheiro', polygon: rect(11.5, 9.5, 2, 4) },
        { id: 'quarto-2', name: 'Quarto 2', kind: 'quarto', polygon: rect(13.5, 9.5, 4.5, 4) },
      ],
    },
  ],
};

export const planCasaJardim: VectorFloorPlan = {
  kind: 'vetorial',
  source: SOURCE,
  levels: [
    {
      id: 'terreo',
      name: 'Térreo',
      elevation: 0,
      height: 2.9,
      width: 24,
      depth: 18,
      rooms: [
        { id: 'sala', name: 'Sala de estar', kind: 'sala', polygon: rect(0, 0, 8, 7), description: 'Sala com portas de correr para o jardim.' },
        { id: 'cozinha', name: 'Cozinha', kind: 'cozinha', polygon: rect(8, 0, 5, 5) },
        { id: 'servico', name: 'Área de serviço', kind: 'servico', polygon: rect(8, 5, 5, 2) },
        { id: 'suite', name: 'Suíte principal', kind: 'suite', polygon: rect(13, 0, 5, 6) },
        { id: 'banho-suite', name: 'Banho da suíte', kind: 'banheiro', polygon: rect(13, 6, 5, 2.5) },
        { id: 'circulacao', name: 'Circulação', kind: 'circulacao', polygon: rect(5, 7, 8, 2) },
        { id: 'quarto-1', name: 'Quarto 1', kind: 'quarto', polygon: rect(0, 7, 5, 5) },
        { id: 'banheiro', name: 'Banheiro', kind: 'banheiro', polygon: rect(5, 9, 3, 3) },
        { id: 'quarto-2', name: 'Quarto 2', kind: 'quarto', polygon: rect(8, 9, 5, 3) },
        { id: 'escritorio', name: 'Escritório', kind: 'escritorio', polygon: rect(13, 8.5, 5, 3.5) },
        { id: 'garagem', name: 'Garagem', kind: 'garagem', polygon: rect(18, 0, 6, 6), openSides: ['n'] },
        { id: 'jardim', name: 'Jardim', kind: 'jardim', polygon: rect(0, 12, 24, 6) },
      ],
    },
  ],
};

export const planCasaPatio: VectorFloorPlan = {
  kind: 'vetorial',
  source: SOURCE,
  levels: [
    {
      id: 'terreo',
      name: 'Térreo',
      elevation: 0,
      height: 3.1,
      width: 20,
      depth: 18,
      rooms: [
        { id: 'jardim', name: 'Pátio-jardim', kind: 'jardim', polygon: rect(6, 6, 8, 12), area: 61, description: 'Pátio central ajardinado em volta da piscina.' },
        { id: 'piscina', name: 'Piscina', kind: 'piscina', polygon: rect(7.5, 9, 5, 7), description: 'Piscina no centro do pátio, visível de todos os ambientes.' },
        { id: 'sala', name: 'Sala de estar', kind: 'sala', polygon: rect(0, 0, 9, 6), description: 'Sala com vidro voltado para o pátio.' },
        { id: 'cozinha', name: 'Cozinha', kind: 'cozinha', polygon: rect(9, 0, 5, 6) },
        { id: 'garagem', name: 'Garagem', kind: 'garagem', polygon: rect(14, 0, 6, 6), openSides: ['n'] },
        { id: 'suite', name: 'Suíte principal', kind: 'suite', polygon: rect(0, 6, 6, 5) },
        { id: 'banho-suite', name: 'Banho da suíte', kind: 'banheiro', polygon: rect(0, 11, 6, 2.5) },
        { id: 'quarto-1', name: 'Quarto', kind: 'quarto', polygon: rect(0, 13.5, 6, 4.5) },
        { id: 'banheiro', name: 'Banheiro', kind: 'banheiro', polygon: rect(14, 6, 6, 2.5) },
        { id: 'gourmet', name: 'Área gourmet', kind: 'gourmet', polygon: rect(14, 8.5, 6, 9.5), description: 'Varanda coberta ao lado da piscina.' },
      ],
    },
  ],
};

export const planEspacoEixo: VectorFloorPlan = {
  kind: 'vetorial',
  source: SOURCE,
  levels: [
    {
      id: 'terreo',
      name: 'Térreo',
      elevation: 0,
      height: 4.2,
      width: 14,
      depth: 14,
      rooms: [
        { id: 'loja', name: 'Salão da loja', kind: 'loja', polygon: rect(0, 0, 10, 14), ceiling: 4.2, description: 'Salão livre com vitrine de vidro para a rua e pé-direito de 4,2 m.', features: ['Vitrine de 10 m', 'Piso nivelado com a calçada'] },
        { id: 'deposito', name: 'Depósito', kind: 'deposito', polygon: rect(10, 0, 4, 8) },
        { id: 'copa', name: 'Copa', kind: 'cozinha', polygon: rect(10, 8, 4, 3) },
        { id: 'banheiro', name: 'Banheiro acessível', kind: 'banheiro', polygon: rect(10, 11, 4, 3) },
      ],
    },
  ],
};

/** Planta vetorial do studio — usada apenas para gerar a imagem estática da planta (o anúncio tem só a imagem). */
export const planStudioLinhaSource: PlanLevel = {
  id: 'unidade',
  name: 'Unidade',
  elevation: 0,
  height: 2.7,
  width: 7,
  depth: 6,
  rooms: [
    { id: 'estar', name: 'Estar e dormitório', kind: 'sala', polygon: rect(0, 0, 7, 4) },
    { id: 'cozinha', name: 'Cozinha', kind: 'cozinha', polygon: rect(0, 4, 3, 2) },
    { id: 'banheiro', name: 'Banheiro', kind: 'banheiro', polygon: rect(3, 4, 2.5, 2) },
    { id: 'varanda', name: 'Varanda', kind: 'varanda', polygon: rect(5.5, 4, 1.5, 2) },
  ],
};
