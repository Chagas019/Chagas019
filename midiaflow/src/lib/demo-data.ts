import { addDays, startOfWeek, subDays } from 'date-fns';
import type { AppData, Member, ParishEvent, Role, Schedule, Slot, SlotStatus } from './types';
import { toISODate } from './utils';

/**
 * DADOS DEMONSTRATIVOS. Nomes, contatos e escalas são fictícios e gerados
 * em relação à data de hoje para a demonstração parecer sempre atual.
 */

export const DEFAULT_ROLES: Role[] = [
  { id: 'foto', name: 'Fotografia', color: '#5BFF9A', icon: 'Camera', description: 'Registro fotográfico da celebração.', compatibleWith: [] },
  { id: 'video', name: 'Videomaker', color: '#55B8FF', icon: 'Video', description: 'Captação e edição de vídeos.', compatibleWith: [] },
  { id: 'stories', name: 'Stories', color: '#B98BFF', icon: 'Smartphone', description: 'Cobertura em tempo real nos stories.', compatibleWith: ['social'] },
  { id: 'social', name: 'Social media', color: '#FF8BD1', icon: 'Share2', description: 'Publicações e legendas nas redes.', compatibleWith: ['stories', 'design'] },
  { id: 'design', name: 'Designer', color: '#FFC857', icon: 'PenTool', description: 'Artes, avisos e materiais gráficos.', compatibleWith: ['social'] },
  { id: 'projecao', name: 'Projeção', color: '#7CF5FF', icon: 'MonitorPlay', description: 'Letras, leituras e avisos no telão.', compatibleWith: [] },
  { id: 'live', name: 'Transmissão ao vivo', color: '#FF6B7A', icon: 'Radio', description: 'Operação da live no YouTube/Instagram.', compatibleWith: ['audio'] },
  { id: 'audio', name: 'Operador de áudio', color: '#A6FF5B', icon: 'Mic', description: 'Mesa de som e microfones.', compatibleWith: ['live'] },
  { id: 'coord', name: 'Coordenação de mídia', color: '#F5F7FA', icon: 'Crown', description: 'Orienta a equipe durante a celebração.', compatibleWith: ['social', 'stories', 'design'] },
];

const NAMES: [string, string[], number[]][] = [
  ['Ana Beatriz Souza', ['coord', 'social', 'stories'], [0, 3, 6]],
  ['Lucas Ferreira', ['foto', 'video'], [0, 6]],
  ['Mariana Costa', ['stories', 'social'], [0, 4, 6]],
  ['Pedro Henrique Lima', ['video', 'live'], [0, 5, 6]],
  ['Júlia Andrade', ['design', 'social'], [1, 2, 3, 4]],
  ['Rafael Oliveira', ['projecao', 'audio'], [0, 4, 6]],
  ['Camila Ribeiro', ['foto'], [0, 6]],
  ['Gabriel Martins', ['live', 'audio'], [0, 6]],
  ['Larissa Mendes', ['stories', 'foto'], [0, 3, 6]],
  ['Thiago Barbosa', ['projecao'], [0, 6]],
  ['Isabela Rocha', ['social', 'design'], [0, 2, 4]],
  ['Felipe Cardoso', ['video', 'foto'], [5, 6]],
  ['Beatriz Nunes', ['audio', 'projecao'], [0, 6]],
  ['João Victor Alves', ['foto', 'stories'], [0, 4, 6]],
  ['Sofia Carvalho', ['design'], [1, 3, 5]],
];

let seed = 7;
const rand = () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

/** Paróquia nova, sem nenhum dado: como se o app tivesse acabado de ser instalado. */
export function buildEmptyData(p: { parish: string; city: string; pascom: string; name: string }): AppData {
  const id = 'm_' + Math.random().toString(36).slice(2, 10);
  const now = new Date().toISOString();
  return {
    parish: { name: p.parish, city: p.city, pascomName: p.pascom || 'PASCOM' },
    roles: DEFAULT_ROLES,
    members: [
      {
        id,
        name: p.name,
        roleIds: ['coord'],
        availability: { weekdays: [0, 6], periods: ['manha', 'noite'], unavailableDates: [] },
        email: '',
        phone: '',
        status: 'ativo',
        access: 'admin',
        joinedAt: toISODate(new Date()),
      },
    ],
    schedules: [],
    events: [],
    notifications: [
      { id: 'n_boas_vindas', kind: 'sistema', title: 'Bem-vindo ao MídiaFlow', body: 'Comece cadastrando a equipe e criando a primeira escala.', createdAt: now, read: false },
    ],
    audit: [],
    announcements: [],
    currentUserId: id,
  };
}

export function buildDemoData(today = new Date()): AppData {
  seed = 7;
  const members: Member[] = NAMES.map(([name, roleIds, weekdays], i) => ({
    id: `m${i + 1}`,
    name,
    roleIds,
    availability: { weekdays, periods: i % 4 === 0 ? ['manha', 'tarde', 'noite'] : ['manha', 'noite'], unavailableDates: [] },
    email: `${name.split(' ')[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')}@exemplo.org`,
    phone: `(11) 9${String(8000 + i * 137).padStart(4, '0')}-${String(1000 + i * 71).slice(-4)}`,
    status: i === 14 ? 'convidado' : i === 11 ? 'inativo' : 'ativo',
    access: i === 0 ? 'coordenador' : 'integrante',
    joinedAt: toISODate(subDays(today, 400 - i * 20)),
  }));
  // Uma indisponibilidade para demonstrar o alerta.
  members[1].availability.unavailableDates.push(toISODate(addDays(startOfWeek(today, { weekStartsOn: 1 }), 13)));

  const admin: Member = {
    id: 'u_admin',
    name: 'Pe. Marcos (Admin)',
    roleIds: ['coord'],
    availability: { weekdays: [0, 1, 2, 3, 4, 5, 6], periods: ['manha', 'tarde', 'noite'], unavailableDates: [] },
    email: 'admin@exemplo.org',
    phone: '(11) 90000-0000',
    status: 'ativo',
    access: 'admin',
    joinedAt: toISODate(subDays(today, 900)),
  };

  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const templates: { offset: number; title: string; start: string; end: string; roles: string[]; type: Schedule['eventType'] }[] = [
    { offset: 3, title: 'Adoração ao Santíssimo', start: '19:30', end: '21:00', roles: ['foto', 'stories', 'projecao'], type: 'Adoração' },
    { offset: 5, title: 'Missa da Vigília', start: '19:00', end: '20:15', roles: ['foto', 'stories', 'social', 'projecao', 'live'], type: 'Missa' },
    { offset: 6, title: 'Missa das Famílias', start: '08:00', end: '09:15', roles: ['foto', 'video', 'stories', 'projecao'], type: 'Missa' },
    { offset: 6, title: 'Missa da Juventude', start: '19:00', end: '20:30', roles: ['foto', 'video', 'stories', 'social', 'projecao', 'live', 'audio', 'coord'], type: 'Missa' },
  ];

  const schedules: Schedule[] = [];
  for (let w = -3; w <= 3; w++) {
    for (const t of templates) {
      const date = addDays(weekStart, w * 7 + t.offset);
      const iso = toISODate(date);
      const past = date < subDays(today, 0) && toISODate(date) !== toISODate(today);
      const used = new Set<string>();
      let refusals = 0;
      const slots: Slot[] = t.roles.map((roleId, k) => {
        const candidates = members.filter(
          (m) => m.status === 'ativo' && m.roleIds.includes(roleId) && !used.has(m.id),
        );
        const r = rand();
        let memberId: string | null = candidates.length ? candidates[Math.floor(r * candidates.length)].id : null;
        // Futuro: algumas vagas abertas para mostrar "precisa de voluntário".
        if (!past && w >= 1 && rand() < 0.22) memberId = null;
        if (memberId) used.add(memberId);
        let status: SlotStatus = 'confirmado';
        if (!past) {
          const x = rand();
          status = x < 0.6 ? 'confirmado' : x < 0.9 ? 'pendente' : x < 0.96 ? 'recusado' : 'substituicao';
          if (w === 0 && t.offset === 6 && t.start === '19:00' && k === 2) status = 'recusado';
          // No máximo uma recusa por celebração, para a demonstração ficar realista.
          if (status === 'recusado' || status === 'substituicao') status = refusals++ ? 'pendente' : status;
        } else if (rand() < 0.08) {
          status = 'recusado';
        }
        return { id: `s_${w}_${t.offset}_${t.start}_${roleId}`, roleId, memberId, status: memberId ? status : 'pendente' };
      });
      schedules.push({
        id: `e_${iso}_${t.start.replace(':', '')}`,
        title: t.title,
        eventType: t.type,
        date: iso,
        start: t.start,
        end: t.end,
        location: 'Matriz São José',
        coordinatorId: 'm1',
        notes: t.title === 'Missa da Juventude' ? 'Chegar 30 minutos antes para testar a transmissão.' : '',
        slots,
        createdAt: subDays(date, 10).toISOString(),
      });
    }
  }

  const ev = (offset: number, e: Omit<ParishEvent, 'id' | 'date' | 'checklist'> & { done?: number }): ParishEvent => ({
    ...e,
    id: `ev_${offset}`,
    date: toISODate(addDays(today, offset)),
    checklist: ['Fotografia', 'Vídeo', 'Stories', 'Entrevistas', 'Bastidores', 'Publicação', 'Organização dos arquivos'].map(
      (label, i) => ({ id: `ck_${offset}_${i}`, label, done: i < (e.done ?? 0) }),
    ),
  });

  const events: ParishEvent[] = [
    ev(9, { title: 'Festa do Padroeiro São José', type: 'Festa paroquial', start: '17:00', end: '23:00', location: 'Pátio da Matriz', description: 'Missa solene, quermesse e shows.', requiredRoleIds: ['foto', 'video', 'stories', 'social', 'live', 'coord'], done: 2 }),
    ev(4, { title: 'Retiro de Jovens — Chamados', type: 'Retiro', start: '08:00', end: '18:00', location: 'Casa de Retiro Emaús', description: 'Dia de espiritualidade com os grupos de jovens.', requiredRoleIds: ['foto', 'stories', 'design'], done: 4 }),
    ev(16, { title: 'Procissão de Nossa Senhora', type: 'Procissão', start: '18:00', end: '20:00', location: 'Ruas do bairro', description: 'Saída da Matriz e retorno com Missa.', requiredRoleIds: ['foto', 'video', 'live'], done: 0 }),
    ev(22, { title: 'Formação PASCOM: fotografia litúrgica', type: 'Formação', start: '14:00', end: '17:00', location: 'Salão Paroquial', description: 'Boas práticas de fotografia durante a liturgia.', requiredRoleIds: ['coord'], done: 1 }),
    ev(-6, { title: 'Campanha do Agasalho', type: 'Campanha solidária', start: '09:00', end: '12:00', location: 'Secretaria paroquial', description: 'Arrecadação e divulgação.', requiredRoleIds: ['social', 'design'], done: 7 }),
  ];

  const now = today.getTime();
  return {
    example: true,
    parish: { name: 'Paróquia São José', city: 'São Paulo — SP', pascomName: 'PASCOM São José' },
    roles: DEFAULT_ROLES,
    members: [admin, ...members],
    schedules,
    events,
    currentUserId: 'm1',
    announcements: [
      { id: 'a1', title: 'Reunião mensal da PASCOM', body: 'Sábado após a Missa da Vigília, no salão paroquial.', author: 'Ana Beatriz Souza', createdAt: new Date(now - 864e5).toISOString(), pinned: true },
      { id: 'a2', title: 'Novo padrão de legendas', body: 'Usar sempre a hashtag da paróquia e citar a leitura do dia.', author: 'Isabela Rocha', createdAt: new Date(now - 3 * 864e5).toISOString() },
    ],
    notifications: [
      { id: 'n1', kind: 'recusa', title: 'Vaga aberta na Missa da Juventude', body: 'Uma pessoa informou que não poderá participar.', createdAt: new Date(now - 2 * 36e5).toISOString(), read: false },
      { id: 'n2', kind: 'confirmacao', title: 'Presenças confirmadas', body: '3 integrantes confirmaram a Missa da Vigília.', createdAt: new Date(now - 6 * 36e5).toISOString(), read: false },
      { id: 'n3', kind: 'sistema', title: 'Bem-vindo ao MídiaFlow', body: 'Você está no modo demonstração. Os dados ficam só neste navegador.', createdAt: new Date(now - 30 * 36e5).toISOString(), read: true },
    ],
    audit: [
      { id: 'au1', at: new Date(now - 2 * 36e5).toISOString(), actor: 'Mariana Costa', action: 'respondeu', entity: 'escala', entityId: '', summary: 'Informou que não poderá participar da Missa da Juventude.' },
      { id: 'au2', at: new Date(now - 5 * 36e5).toISOString(), actor: 'Ana Beatriz Souza', action: 'designou', entity: 'escala', entityId: '', summary: 'Designou Lucas Ferreira para Fotografia na Missa das Famílias.' },
      { id: 'au3', at: new Date(now - 26 * 36e5).toISOString(), actor: 'Ana Beatriz Souza', action: 'criou', entity: 'evento', entityId: 'ev_9', summary: 'Criou o evento Festa do Padroeiro São José.' },
    ],
  };
}
