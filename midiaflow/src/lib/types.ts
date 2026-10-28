export type AccessLevel = 'admin' | 'coordenador' | 'integrante';

export type SlotStatus = 'pendente' | 'confirmado' | 'recusado' | 'substituicao';

/** Status derivado de uma escala a partir das vagas. */
export type ScheduleStatus = 'completa' | 'aguardando' | 'precisa';

export type Period = 'manha' | 'tarde' | 'noite';

export type EventType =
  | 'Missa'
  | 'Adoração'
  | 'Retiro'
  | 'Festa paroquial'
  | 'Procissão'
  | 'Encontro de jovens'
  | 'Formação'
  | 'Campanha solidária'
  | 'Evento especial';

export interface Role {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  /** Funções que a mesma pessoa pode acumular na mesma celebração. */
  compatibleWith: string[];
}

export interface Availability {
  weekdays: number[]; // 0 = domingo
  periods: Period[];
  unavailableDates: string[]; // yyyy-MM-dd
}

export interface Member {
  id: string;
  name: string;
  photo?: string;
  roleIds: string[];
  availability: Availability;
  email: string;
  phone: string;
  status: 'ativo' | 'inativo' | 'convidado';
  access: AccessLevel;
  joinedAt: string;
}

export interface Slot {
  id: string;
  roleId: string;
  memberId: string | null;
  status: SlotStatus;
  note?: string;
  respondedAt?: string;
}

export interface Schedule {
  id: string;
  title: string;
  eventType: EventType;
  eventId?: string;
  date: string; // yyyy-MM-dd
  start: string; // HH:mm
  end: string;
  location: string;
  coordinatorId: string;
  notes: string;
  slots: Slot[];
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface ParishEvent {
  id: string;
  title: string;
  type: EventType;
  date: string;
  start: string;
  end: string;
  location: string;
  description: string;
  requiredRoleIds: string[];
  checklist: ChecklistItem[];
}

export interface AppNotification {
  id: string;
  kind: 'confirmacao' | 'recusa' | 'substituicao' | 'escala' | 'aviso' | 'sistema';
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  scheduleId?: string;
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  action: 'criou' | 'editou' | 'excluiu' | 'duplicou' | 'designou' | 'respondeu' | 'removeu';
  entity: 'escala' | 'evento' | 'integrante' | 'função' | 'aviso' | 'configuração';
  entityId: string;
  summary: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  author: string;
  createdAt: string;
  pinned?: boolean;
}

export interface Parish {
  name: string;
  city: string;
  pascomName: string;
}

export interface AppData {
  parish: Parish;
  roles: Role[];
  members: Member[];
  schedules: Schedule[];
  events: ParishEvent[];
  notifications: AppNotification[];
  audit: AuditEntry[];
  announcements: Announcement[];
  currentUserId: string;
  /** Marca de origem: tudo gerado pelo seed é demonstrativo. */
  demo: true;
}
