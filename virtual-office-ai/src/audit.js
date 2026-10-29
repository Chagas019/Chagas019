// Registro de auditoria: quem pediu, quem executou, o que foi feito e qual aprovação autorizou.
import { now, J } from './db.js';

export function audit(db, { ator, acao, alvo = null, detalhes = null, approval_id = null, task_id = null, client_id = null }) {
  db.prepare(`INSERT INTO audit_log (ts, ator, acao, alvo, detalhes, approval_id, task_id, client_id) VALUES (?,?,?,?,?,?,?,?)`)
    .run(now(), ator, acao, alvo, J(detalhes), approval_id, task_id, client_id);
}

export function notify(db, para, tipo, mensagem, task_id = null) {
  db.prepare('INSERT INTO notifications (para, tipo, mensagem, task_id, created_at) VALUES (?,?,?,?,?)').run(para, tipo, mensagem, task_id, now());
}
