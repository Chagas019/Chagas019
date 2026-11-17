import { CONFIG } from './config.js';
import { waLink } from './render/contact.js';

const MSG = {
  name: { valueMissing: 'Informe seu nome.', tooShort: 'Nome muito curto.' },
  email: { valueMissing: 'Informe seu e-mail.', typeMismatch: 'E-mail inválido. Ex.: nome@dominio.com' },
  message: { valueMissing: 'Escreva uma mensagem.', tooShort: 'Conte um pouco mais (mín. 10 caracteres).' },
};

function errorText(input) {
  const v = input.validity; const m = MSG[input.name] || {};
  if (v.valueMissing) return m.valueMissing || 'Campo obrigatório.';
  if (v.typeMismatch) return m.typeMismatch || 'Formato inválido.';
  if (v.tooShort) return m.tooShort || 'Muito curto.';
  return input.validationMessage;
}

function showError(form, input) {
  const err = form.querySelector(`[data-error-for="${input.name}"]`);
  const bad = !input.checkValidity();
  input.setAttribute('aria-invalid', String(bad));
  if (err) { err.textContent = bad ? errorText(input) : ''; err.hidden = !bad; }
  return !bad;
}

function compose(data) {
  return [
    `Olá! Meu nome é ${data.name}.`,
    data.service && `Serviço: ${data.service}`,
    data.date && `Data prevista: ${data.date}`,
    '', data.message, '', `Contato: ${data.email}`,
  ].filter((x) => x !== false && x != null).join('\n');
}

/**
 * Formulário: validação nativa + mensagens acessíveis (aria-invalid, aria-describedby).
 * Com CONFIG.formEndpoint → POST (Accept: application/json); só mostra sucesso com resposta ok.
 * Sem endpoint → abre WhatsApp/e-mail com a mensagem montada e diz isso claramente.
 */
export function initForm(site) {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const status = form.querySelector('[data-slot="form-status"]');
  const hint = form.querySelector('[data-slot="form-hint"]');
  const submit = form.querySelector('[type="submit"]');
  const fields = [...form.querySelectorAll('input[required], textarea[required], input[type="email"]')];

  const channel = () => {
    const pref = CONFIG.fallbackChannel;
    if (pref === 'whatsapp' && site.whatsapp) return 'whatsapp';
    if (site.email) return 'email';
    return site.whatsapp ? 'whatsapp' : null;
  };
  if (!CONFIG.formEndpoint && hint) {
    const c = channel();
    hint.textContent = c === 'whatsapp' ? 'Ao enviar, o WhatsApp abre com sua mensagem pronta.'
      : c === 'email' ? 'Ao enviar, seu app de e-mail abre com a mensagem pronta.' : '';
  }
  if (!CONFIG.formEndpoint && submit && channel() === 'whatsapp') submit.textContent = 'Enviar pelo WhatsApp';

  // pré-seleciona serviço vindo de um CTA de preço
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-service]');
    const sel = form.elements.service;
    if (!a || !sel) return;
    if ([...sel.options].some((o) => o.value === a.dataset.service)) sel.value = a.dataset.service;
    if (a.dataset.tier && !form.elements.message.value) form.elements.message.value = `Tenho interesse no pacote "${a.dataset.tier}". `;
  });

  fields.forEach((f) => {
    f.addEventListener('blur', () => { if (f.value) showError(form, f); });
    f.addEventListener('input', () => { if (f.getAttribute('aria-invalid') === 'true') showError(form, f); });
  });

  const setStatus = (text, kind) => { status.textContent = text; status.dataset.kind = kind || ''; };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (form.elements._gotcha?.value) return; // honeypot
    const ok = fields.map((f) => showError(form, f)).every(Boolean);
    if (!ok) {
      const first = fields.find((f) => !f.checkValidity());
      setStatus('Revise os campos destacados.', 'error');
      first?.focus();
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    delete data._gotcha;

    if (CONFIG.formEndpoint) {
      submit.disabled = true; form.setAttribute('aria-busy', 'true');
      setStatus('Enviando…', 'pending');
      try {
        const res = await fetch(CONFIG.formEndpoint, {
          method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(String(res.status));
        form.reset();
        setStatus('Mensagem enviada. Respondo em breve.', 'success');
      } catch (err) {
        setStatus(`Não foi possível enviar agora (${err.message}). Tente pelo WhatsApp ou e-mail ao lado.`, 'error');
      } finally { submit.disabled = false; form.removeAttribute('aria-busy'); }
      return;
    }

    const text = compose(data);
    const c = channel();
    if (c === 'whatsapp') {
      window.open(waLink(site.whatsapp, text), '_blank', 'noopener');
      setStatus('Abrimos o WhatsApp com sua mensagem. Ela só é enviada quando você tocar em enviar por lá.', 'info');
    } else if (c === 'email') {
      const subject = `Orçamento${data.service ? ` — ${data.service}` : ''} (${data.name})`;
      window.location.href = `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
      setStatus('Abrimos seu app de e-mail com a mensagem. Ela só é enviada quando você confirmar o envio por lá.', 'info');
    } else {
      setStatus('Envio indisponível no momento: nenhum canal de contato configurado.', 'error');
    }
  });
}
