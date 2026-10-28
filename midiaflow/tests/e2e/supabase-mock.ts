import type { Page, Route } from '@playwright/test';

/**
 * Simulador do Supabase para os testes de ponta a ponta.
 * Responde às mesmas rotas que o app usa (Auth, REST e RPC) e aplica as mesmas
 * regras das funções do banco (supabase/migrations). As regras reais do banco
 * são testadas à parte, num PostgreSQL de verdade (supabase/tests).
 */
export const MOCK_URL = 'http://supabase.mock';

type Access = 'admin' | 'coordenador' | 'integrante';
interface User { id: string; email: string; password: string; name: string }
interface Profile { id: string; parish_id: string; member_id: string; access: Access; full_name: string }
type Json = any;

export class SupabaseMock {
  users: User[] = [];
  tokens = new Map<string, string>();
  parishes: { id: string; name: string; invite_code: string }[] = [];
  profiles: Profile[] = [];
  data = new Map<string, { data: Json; version: number }>();
  contacts: { parish_id: string; member_id: string; email: string; phone: string }[] = [];
  training = new Map<string, { done: string[]; quiz: Json }>();
  calls: string[] = [];
  private seq = 0;

  id(prefix = '') {
    this.seq += 1;
    return `${prefix}${String(this.seq).padStart(4, '0')}-0000-4000-8000-${String(this.seq).padStart(12, '0')}`;
  }

  addUser(email: string, password: string, name: string) {
    const u = { id: this.id('00000000'), email, password, name };
    this.users.push(u);
    return u;
  }

  newMember(id: string, name: string, access: Access) {
    return { id, name, roleIds: [], availability: { weekdays: [0, 6], periods: ['manha', 'noite'], unavailableDates: [] }, email: '', phone: '', status: 'ativo', access, joinedAt: '2026-01-01' };
  }

  /** Cria uma paróquia já pronta, com um administrador. */
  seedParish(admin: User, roles: Json[], extra: Partial<Json> = {}) {
    const pid = this.id('p0000000');
    const code = 'CONVITE1';
    this.parishes.push({ id: pid, name: 'Paróquia Teste', invite_code: code });
    const mid = 'm_admin';
    this.profiles.push({ id: admin.id, parish_id: pid, member_id: mid, access: 'admin', full_name: admin.name });
    this.contacts.push({ parish_id: pid, member_id: mid, email: admin.email, phone: '' });
    this.data.set(pid, {
      version: 1,
      data: {
        parish: { name: 'Paróquia Teste', city: 'SP', pascomName: 'PASCOM Teste' },
        roles, members: [this.newMember(mid, admin.name, 'admin')],
        schedules: [], events: [], notifications: [], audit: [], announcements: [], ...extra,
      },
    });
    return { pid, code };
  }

  private session(u: User) {
    const token = `mock.${Buffer.from(JSON.stringify({ sub: u.id, exp: 4102444800 })).toString('base64url')}.sig`;
    this.tokens.set(token, u.id);
    return {
      access_token: token, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: `r-${u.id}`,
      user: this.userJson(u),
    };
  }

  private userJson(u: User) {
    return { id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, user_metadata: { full_name: u.name }, app_metadata: { provider: 'email' }, created_at: '2026-01-01T00:00:00Z' };
  }

  private caller(route: Route) {
    const auth = route.request().headers()['authorization'] ?? '';
    const uid = this.tokens.get(auth.replace(/^Bearer /, ''));
    return { uid, profile: this.profiles.find((p) => p.id === uid) };
  }

  async install(page: Page) {
    await page.routeWebSocket(/supabase\.mock/, () => { /* tempo real: aceita a conexão e não envia nada */ });
    await page.route(`${MOCK_URL}/**`, (route) => this.handle(route));
  }

  private json(route: Route, status: number, body: unknown) {
    return route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: body === undefined ? '' : JSON.stringify(body) });
  }

  private err(route: Route, code: string) {
    return this.json(route, 400, { code: 'P0001', message: code, details: null, hint: null });
  }

  private async handle(route: Route) {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    const body = (() => { try { return req.postDataJSON(); } catch { return {}; } })();
    this.calls.push(`${method} ${path}`);

    /* ---------- Auth ---------- */
    if (path === '/auth/v1/signup') {
      if (this.users.some((u) => u.email === body.email)) return this.json(route, 422, { code: 'user_already_exists', msg: 'User already registered' });
      const u = this.addUser(body.email, body.password, body.data?.full_name ?? '');
      return this.json(route, 200, this.session(u));
    }
    if (path === '/auth/v1/token') {
      const u = this.users.find((x) => x.email === body.email && x.password === body.password);
      if (!u) return this.json(route, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials', code: 'invalid_credentials', msg: 'Invalid login credentials' });
      return this.json(route, 200, this.session(u));
    }
    if (path === '/auth/v1/user') {
      const { uid } = this.caller(route);
      const u = this.users.find((x) => x.id === uid);
      return u ? this.json(route, 200, this.userJson(u)) : this.json(route, 401, { msg: 'invalid JWT' });
    }
    if (path === '/auth/v1/logout') return route.fulfill({ status: 204 });
    if (path === '/auth/v1/recover') return this.json(route, 200, {});

    /* ---------- REST ---------- */
    const { uid, profile } = this.caller(route);
    const staff = profile?.access === 'admin' || profile?.access === 'coordenador';
    const eq = (k: string) => url.searchParams.get(k)?.replace(/^eq\./, '');

    if (path === '/rest/v1/profiles') return this.json(route, 200, this.profiles.filter((p) => p.id === eq('id') && p.id === uid));
    if (path === '/rest/v1/parish_data') {
      const row = profile && profile.parish_id === eq('parish_id') ? this.data.get(profile.parish_id) : undefined;
      return row ? this.json(route, 200, { data: row.data, version: row.version }) : this.json(route, 406, { message: 'no rows' });
    }
    if (path === '/rest/v1/member_contacts') {
      if (!profile) return this.json(route, 200, []);
      if (method === 'GET') return this.json(route, 200, this.contacts.filter((c) => c.parish_id === profile.parish_id && (staff || c.member_id === profile.member_id)));
      const rows = Array.isArray(body) ? body : [body];
      for (const r of rows) {
        if (r.parish_id !== profile.parish_id || (!staff && r.member_id !== profile.member_id)) return this.json(route, 403, { message: 'new row violates row-level security policy' });
        const i = this.contacts.findIndex((c) => c.parish_id === r.parish_id && c.member_id === r.member_id);
        if (i >= 0) this.contacts[i] = { ...this.contacts[i], ...r };
        else this.contacts.push({ email: '', phone: '', ...r });
      }
      return this.json(route, 201, undefined);
    }
    if (path === '/rest/v1/training_progress') {
      if (!uid) return this.json(route, 401, {});
      if (method === 'GET') return this.json(route, 200, this.training.has(uid) ? [this.training.get(uid)] : []);
      this.training.set(uid, { done: body.done, quiz: body.quiz });
      return this.json(route, 201, undefined);
    }

    /* ---------- RPC ---------- */
    const rpc = path.match(/^\/rest\/v1\/rpc\/(\w+)$/)?.[1];
    if (rpc) return this.rpc(route, rpc, body, uid, profile, staff);
    return this.json(route, 404, { message: `rota não simulada: ${method} ${path}` });
  }

  private bump(pid: string, data: Json) {
    const row = this.data.get(pid)!;
    row.data = data;
    row.version += 1;
    return row.version;
  }

  private rpc(route: Route, fn: string, b: Json, uid: string | undefined, profile: Profile | undefined, staff: boolean) {
    if (!uid) return this.err(route, 'not_authenticated');
    const user = this.users.find((u) => u.id === uid)!;
    switch (fn) {
      case 'create_parish': {
        if (profile) return this.err(route, 'already_member');
        const pid = this.id('p0000000');
        const mid = `m_${pid.slice(0, 8)}`;
        this.parishes.push({ id: pid, name: b.p_name, invite_code: 'NOVO1234' });
        this.profiles.push({ id: uid, parish_id: pid, member_id: mid, access: 'admin', full_name: b.p_full_name });
        this.contacts.push({ parish_id: pid, member_id: mid, email: user.email, phone: '' });
        this.data.set(pid, { version: 1, data: { parish: { name: b.p_name, city: b.p_city, pascomName: b.p_pascom }, roles: b.p_roles, members: [this.newMember(mid, b.p_full_name, 'admin')], schedules: [], events: [], notifications: [], audit: [], announcements: [] } });
        return this.json(route, 200, pid);
      }
      case 'join_parish': {
        if (profile) return this.err(route, 'already_member');
        const p = this.parishes.find((x) => x.invite_code === String(b.p_code).toUpperCase().trim());
        if (!p) return this.err(route, 'invalid_code');
        const row = this.data.get(p.id)!;
        const pre = this.contacts.find((c) => c.parish_id === p.id && c.email && c.email.toLowerCase() === user.email.toLowerCase() && !this.profiles.some((x) => x.parish_id === p.id && x.member_id === c.member_id));
        let mid = pre?.member_id;
        const data = structuredClone(row.data);
        if (!mid) {
          mid = `m_${this.id().slice(0, 8)}`;
          data.members.push(this.newMember(mid, b.p_full_name, 'integrante'));
          this.contacts.push({ parish_id: p.id, member_id: mid, email: user.email, phone: '' });
        } else {
          data.members = data.members.map((m: Json) => (m.id === mid ? { ...m, access: 'integrante', status: 'ativo' } : m));
        }
        this.profiles.push({ id: uid, parish_id: p.id, member_id: mid, access: 'integrante', full_name: b.p_full_name });
        this.bump(p.id, data);
        return this.json(route, 200, p.id);
      }
      case 'save_parish_data': {
        if (!profile) return this.err(route, 'not_member');
        if (!staff) return this.err(route, 'forbidden');
        const row = this.data.get(profile.parish_id)!;
        if (row.version !== b.p_version) return this.err(route, 'version_conflict');
        const data = structuredClone(b.p_data);
        data.members = data.members.map((m: Json) => {
          const old = row.data.members.find((o: Json) => o.id === m.id);
          return { ...m, email: '', phone: '', access: profile.access === 'admin' ? m.access : old?.access ?? 'integrante' };
        });
        if (profile.access !== 'admin') data.parish = row.data.parish;
        return this.json(route, 200, this.bump(profile.parish_id, data));
      }
      case 'respond_assignment': {
        if (!profile) return this.err(route, 'not_member');
        const row = this.data.get(profile.parish_id)!;
        const data = structuredClone(row.data);
        const s = data.schedules.find((x: Json) => x.id === b.p_schedule_id);
        const slot = s?.slots.find((x: Json) => x.id === b.p_slot_id && x.memberId === profile.member_id);
        if (!slot) return this.err(route, 'not_your_slot');
        Object.assign(slot, { status: b.p_status, note: b.p_note, respondedAt: new Date().toISOString() });
        data.notifications.unshift({ id: `n_${this.id()}`, kind: b.p_status === 'confirmado' ? 'confirmacao' : 'recusa', title: 'Presença confirmada', body: `${profile.full_name} respondeu`, createdAt: new Date().toISOString(), read: false, scheduleId: s.id });
        return this.json(route, 200, this.bump(profile.parish_id, data));
      }
      case 'update_my_availability': {
        if (!profile) return this.err(route, 'not_member');
        const row = this.data.get(profile.parish_id)!;
        const data = structuredClone(row.data);
        data.members = data.members.map((m: Json) => (m.id === profile.member_id ? { ...m, availability: b.p_availability } : m));
        return this.json(route, 200, this.bump(profile.parish_id, data));
      }
      case 'get_invite_code':
        if (!staff) return this.err(route, 'forbidden');
        return this.json(route, 200, this.parishes.find((p) => p.id === profile!.parish_id)!.invite_code);
      case 'regenerate_invite_code': {
        if (profile?.access !== 'admin') return this.err(route, 'forbidden');
        const p = this.parishes.find((x) => x.id === profile.parish_id)!;
        p.invite_code = 'TROCADO9';
        return this.json(route, 200, p.invite_code);
      }
    }
    return this.json(route, 404, { message: `função não simulada: ${fn}` });
  }
}
