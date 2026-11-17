import { CONFIG } from './config.js';
import { waLink, mailLink } from './render/contact.js';

/**
 * Formulário de orçamento (form#quote-form).
 * Regras: nome, ≥1 serviço (checkboxes name="services"), mensagem e pelo menos um contato
 * (e-mail OU telefone; o e-mail, se preenchido, precisa ser válido).
 * Erros acessíveis: aria-invalid + [data-error-for] ligado por aria-describedby + status aria-live.
 * Envio: monta a mensagem e abre wa.me/<número>?text=… (ou mailto com o mesmo corpo).
 * Nunca simula sucesso: o texto deixa claro que o envio só acontece no app aberto.
 * Com CONFIG.formEndpoint → POST JSON; sucesso só com resposta ok.
 */
const MSG = {
  name: { valueMissing: 'Informe seu nome.', tooShort: 'Nome muito curto.' },
  email: { typeMismatch: 'E-mail inválido. Ex.: nome@dominio.com', contact: 'Informe um e-mail ou um telefone para retorno.' },
  phone: { invalid: 'Telefone incompleto. Inclua o DDD, ex.: (19) 90000-0000.' },
  message: { valueMissing: 'Conte um pouco sobre o projeto.', tooShort: 'Conte um pouco mais (mín. 10 caracteres).' },
  services: { valueMissing: 'Selecione ao menos um serviço.' },
};

const digits = (v) => String(v || '').replace(/\D/g, '');

export function composeQuote(d) {
  return [
    `Olá, Chagas! Meu nome é ${d.name}.`,
    'Gostaria de um orçamento para:',
    ...d.services.map((s) => `• ${s}`),
    '',
    d.message,
    '',
    'Contato para retorno:',
    d.email && `E-mail: ${d.email}`,
    d.phone && `Telefone: ${d.phone}`,
    '',
    '(Mensagem enviada pelo formulário do site.)',
  ].filter((x) => x != null && x !== false).join('\n');
}

export function initForm(site) {
  const form = document.getElementById('quote-form') || document.getElementById('contact-form');
  if (!form) return;
  const status = form.querySelector('[data-slot="form-status"]') || document.querySelector('[data-slot="form-status"]');
  const hint = form.querySelector('[data-slot="form-hint"]') || document.querySelector('[data-slot="form-hint"]');
  const el = form.elements;
  const btnWa = form.querySelector('[data-submit="whatsapp"]');
  const btnMail = form.querySelector('[data-submit="email"]');
  // pelo menos um contato: e-mail deixa de ser obrigatório sozinho (validação feita aqui)
  if (el.email) el.email.required = false;

  const errNode = (name) => form.querySelector(`[data-error-for="${name}"]`);
  const ensureDescribed = (input, name) => {
    const err = errNode(name);
    if (!input || !err || !err.id || !input.setAttribute) return;
    const ids = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (!ids.includes(err.id)) input.setAttribute('aria-describedby', [...ids, err.id].join(' '));
  };
  const serviceInputs = () => [...form.querySelectorAll('input[name="services"]')];
  ['name', 'email', 'phone', 'message'].forEach((n) => ensureDescribed(el[n], n));

  const setErr = (name, text, inputs) => {
    const err = errNode(name);
    const bad = !!text;
    inputs.filter(Boolean).forEach((i) => i.setAttribute('aria-invalid', String(bad)));
    if (err) { err.textContent = text || ''; err.hidden = !bad; }
    return !bad;
  };

  const checks = {
    name: () => {
      const v = el.name; if (!v) return true;
      v.value = v.value.replace(/\s+/g, ' ').trimStart();
      const t = v.value.trim();
      return setErr('name', !t ? MSG.name.valueMissing : t.length < 2 ? MSG.name.tooShort : '', [v]);
    },
    email: () => {
      const e = el.email; const p = el.phone;
      const ev = e ? e.value.trim() : ''; const pv = p ? digits(p.value) : '';
      let msg = '';
      if (ev && e && e.validity.typeMismatch) msg = MSG.email.typeMismatch;
      else if (!ev && !pv) msg = MSG.email.contact;
      return setErr('email', msg, [e]);
    },
    phone: () => {
      const p = el.phone; if (!p) return true;
      const n = digits(p.value);
      return setErr('phone', n && (n.length < 10 || n.length > 13) ? MSG.phone.invalid : '', [p]);
    },
    message: () => {
      const m = el.message; if (!m) return true;
      const t = m.value.trim();
      return setErr('message', !t ? MSG.message.valueMissing : t.length < 10 ? MSG.message.tooShort : '', [m]);
    },
    services: () => {
      const boxes = serviceInputs(); if (!boxes.length) return true;
      const ok = boxes.some((b) => b.checked);
      const r = setErr('services', ok ? '' : MSG.services.valueMissing, []);
      const fs = boxes[0].closest('fieldset.form__fieldset') || form.querySelector('[data-slot="service-options"]');
      if (fs) fs.setAttribute('aria-invalid', String(!ok));
      return r;
    },
  };

  const setStatus = (text, kind) => { if (status) { status.textContent = text; status.dataset.kind = kind || ''; } };

  if (hint) {
    hint.textContent = 'Os botões abrem o WhatsApp ou o seu app de e-mail com a mensagem pronta — o envio só acontece quando você confirmar por lá.';
  }
  if (btnWa && !site.whatsapp) btnWa.hidden = true;
  if (btnMail && !site.email) btnMail.hidden = true;

  // revalida enquanto corrige
  form.addEventListener('input', (e) => {
    const n = e.target.name;
    if (n === 'services') { if (errNode('services') && !errNode('services').hidden) checks.services(); return; }
    if (n === 'phone' || n === 'email') { if (el.email?.getAttribute('aria-invalid') === 'true') checks.email(); if (n === 'phone' && el.phone.getAttribute('aria-invalid') === 'true') checks.phone(); return; }
    if (checks[n] && e.target.getAttribute('aria-invalid') === 'true') checks[n]();
  });
  form.addEventListener('focusout', (e) => {
    const n = e.target.name;
    if (!e.target.value || n === 'services') return;
    if (n === 'phone') { checks.phone(); if (el.email?.getAttribute('aria-invalid') === 'true') checks.email(); }
    else if (checks[n]) checks[n]();
  });

  // CTA de preço/produto (a[data-service]) → marca o serviço correspondente
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-service]');
    if (!a) return;
    const box = serviceInputs().find((b) => b.value === a.dataset.service);
    if (box) { box.checked = true; checks.services(); }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (el._gotcha?.value) return; // honeypot
    const channel = e.submitter?.dataset.submit || e.submitter?.value || (site.whatsapp ? 'whatsapp' : 'email');
    const order = ['services', 'message', 'name', 'email', 'phone'];
    const results = order.map((k) => [k, checks[k]()]);
    const firstBad = results.find(([, ok]) => !ok);
    if (firstBad) {
      const n = results.filter(([, ok]) => !ok).length;
      setStatus(`Revise ${n === 1 ? 'o campo destacado' : `os ${n} campos destacados`} antes de enviar.`, 'error');
      const k = firstBad[0];
      (k === 'services' ? serviceInputs()[0] : el[k])?.focus();
      return;
    }
    const data = {
      name: el.name.value.trim(),
      email: el.email ? el.email.value.trim() : '',
      phone: el.phone ? el.phone.value.trim() : '',
      services: serviceInputs().filter((b) => b.checked).map((b) => b.value),
      message: el.message.value.trim(),
    };
    const text = composeQuote(data);
    const subject = `Orçamento — ${data.services.map((s) => s.split(' — ').pop()).join(', ')} (${data.name})`;

    // envio direto (botão data-submit="endpoint"), só quando CONFIG.formEndpoint existir
    if (CONFIG.formEndpoint && channel === 'endpoint') {
      form.setAttribute('aria-busy', 'true'); setStatus('Enviando…', 'pending');
      try {
        const res = await fetch(CONFIG.formEndpoint, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!res.ok) throw new Error(String(res.status));
        form.reset();
        setStatus('Mensagem recebida pelo formulário. Respondo em breve.', 'success');
      } catch (err) {
        setStatus(`Não foi possível enviar agora (${err.message}). Use o WhatsApp ou o e-mail.`, 'error');
      } finally { form.removeAttribute('aria-busy'); }
      return;
    }

    if (channel === 'email' && site.email) {
      window.location.href = mailLink(site.email, subject, text);
      setStatus('Abrimos seu app de e-mail com a mensagem pronta. Ela só é enviada quando você confirmar o envio por lá.', 'info');
      return;
    }
    if (site.whatsapp) {
      window.open(waLink(site.whatsapp, text), '_blank', 'noopener');
      const mail = site.email ? ' Se preferir, use “Enviar por e-mail”.' : '';
      setStatus(`Abrimos o WhatsApp com sua mensagem pronta em uma nova aba. Ela só é enviada quando você tocar em enviar por lá.${mail}`, 'info');
      return;
    }
    if (site.email) {
      window.location.href = mailLink(site.email, subject, text);
      setStatus('Abrimos seu app de e-mail com a mensagem pronta. Ela só é enviada quando você confirmar o envio por lá.', 'info');
      return;
    }
    setStatus('Envio indisponível no momento: nenhum canal de contato configurado.', 'error');
  });
}
