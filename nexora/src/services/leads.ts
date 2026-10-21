/** Solicitações de contato e de visita. Visitantes só conseguem ENVIAR (RLS); a equipe lê e atualiza. */
import type { Lead } from '@/types/property';
import { supabase } from '@/lib/supabase';
import { readJSON, uid, writeJSON } from '@/lib/storage';
import { invalidate } from './query';

const KEY = 'nexora:demo:leads';
export type NewLead = Omit<Lead, 'id' | 'status' | 'createdAt' | 'notes'>;

export async function createLead(input: NewLead): Promise<void> {
  if (!supabase) {
    const all = readJSON<Lead[]>(KEY, []);
    all.unshift({ ...input, id: uid(), status: 'novo', createdAt: new Date().toISOString() });
    if (!writeJSON(KEY, all.slice(0, 500))) throw new Error('Não foi possível registrar a solicitação neste navegador.');
    invalidate('leads');
    return;
  }
  const { error } = await supabase.from('leads').insert({
    kind: input.kind, name: input.name, email: input.email, phone: input.phone || null, message: input.message || null,
    property_id: input.propertyId && !input.propertyId.startsWith('demo-') ? input.propertyId : null,
    property_name: input.propertyName ?? null, visit_at: input.visitAt ?? null, visit_mode: input.visitMode ?? null,
    source: input.source, consent: input.consent,
  });
  if (error) throw new Error('Não foi possível enviar agora. Tente novamente em instantes.');
  invalidate('leads');
}

export async function listLeads(): Promise<Lead[]> {
  if (!supabase) return readJSON<Lead[]>(KEY, []);
  const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) throw new Error('Sem permissão para ver os contatos.');
  return (data ?? []).map((r) => ({
    id: r.id, kind: r.kind, name: r.name, email: r.email, phone: r.phone ?? undefined, message: r.message ?? undefined,
    propertyId: r.property_id ?? undefined, propertyName: r.property_name ?? undefined, visitAt: r.visit_at ?? undefined,
    visitMode: r.visit_mode ?? undefined, source: r.source, status: r.status, consent: r.consent, createdAt: r.created_at, notes: r.notes ?? undefined,
  }));
}

export async function updateLead(id: string, patch: Pick<Partial<Lead>, 'status' | 'notes'>): Promise<void> {
  if (!supabase) {
    writeJSON(KEY, readJSON<Lead[]>(KEY, []).map((l) => (l.id === id ? { ...l, ...patch } : l)));
    invalidate('leads');
    return;
  }
  const { error } = await supabase.from('leads').update(patch).eq('id', id);
  if (error) throw new Error('Não foi possível atualizar o contato.');
  invalidate('leads');
}
