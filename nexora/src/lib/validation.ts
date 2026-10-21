/** Validação de formulários (zod). As mesmas regras existem como CHECK no banco. */
import { z } from 'zod';

const phone = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^\+?[\d\s().-]{10,20}$/.test(v), 'Informe um telefone com DDD, ex.: (11) 99999-9999');

export const leadSchema = z
  .object({
    kind: z.enum(['informacoes', 'visita', 'contato']),
    name: z.string().trim().min(2, 'Informe seu nome').max(120, 'Nome muito longo'),
    email: z.string().trim().email('Informe um e-mail válido').max(160),
    phone,
    message: z.string().trim().max(2000, 'Mensagem muito longa (máx. 2.000 caracteres)').optional(),
    visitDate: z.string().optional(),
    visitTime: z.string().optional(),
    visitMode: z.enum(['presencial', 'video']).optional(),
    consent: z.literal(true, { errorMap: () => ({ message: 'É preciso concordar para enviarmos sua solicitação' }) }),
    /** campo invisível contra robôs */
    website: z.string().max(0).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kind !== 'visita') return;
    if (!v.visitDate) { ctx.addIssue({ code: 'custom', path: ['visitDate'], message: 'Escolha o dia da visita' }); return; }
    const d = new Date(`${v.visitDate}T12:00:00`);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const max = new Date(today); max.setDate(max.getDate() + 60);
    if (Number.isNaN(d.getTime()) || d < tomorrow) ctx.addIssue({ code: 'custom', path: ['visitDate'], message: 'Escolha uma data a partir de amanhã' });
    else if (d > max) ctx.addIssue({ code: 'custom', path: ['visitDate'], message: 'Agendamos com até 60 dias de antecedência' });
    else if (d.getDay() === 0) ctx.addIssue({ code: 'custom', path: ['visitDate'], message: 'Não há visitas aos domingos' });
    if (!v.visitTime) ctx.addIssue({ code: 'custom', path: ['visitTime'], message: 'Escolha um horário' });
    if (!v.visitMode) ctx.addIssue({ code: 'custom', path: ['visitMode'], message: 'Escolha o formato' });
  });

export type LeadInput = z.input<typeof leadSchema>;

export const VISIT_TIMES = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];

export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) { const k = String(i.path[0]); if (!out[k]) out[k] = i.message; }
  return out;
}

export const loginSchema = z.object({
  email: z.string().trim().email('Informe um e-mail válido'),
  password: z.string().min(8, 'A senha tem pelo menos 8 caracteres'),
  name: z.string().trim().max(120).optional(),
});
