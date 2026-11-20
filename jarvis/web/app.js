// JARVIS — app web instalável (PWA). Fala com a API no mesmo domínio.
const $ = (s) => document.querySelector(s);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* sem storage */ } },
};

let token = store.get("jarvis.token");
let conversationId = store.get("jarvis.conversation");
let speakReplies = store.get("jarvis.speak") === "1";
let busy = false;

class ApiError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}

async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = { accept: "application/json" };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (auth && token) headers.authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, "network", "Sem conexão com o servidor.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data.error || {};
    throw new ApiError(res.status, e.code || "internal", friendly(res.status, e.code, e.message));
  }
  return data;
}

function friendly(status, code, msg) {
  if (status === 401) return "Token inválido ou expirado.";
  if (code === "budget_exceeded") return "Limite diário de IA atingido. Tente amanhã.";
  if (code === "provider_unavailable") return "A IA está indisponível no momento. Tente de novo em instantes.";
  if (code === "rate_limited") return "Muitas mensagens seguidas. Aguarde um pouco.";
  return msg || "Algo deu errado.";
}

/* ---------------- Login ---------------- */
function showLogin(err = "") {
  $("#main").hidden = true;
  $("#login").hidden = false;
  $("#login-error").textContent = err;
}

async function showMain() {
  $("#login").hidden = true;
  $("#main").hidden = false;
  await loadConversation();
}

$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const t = $("#token").value.trim();
  if (t.length < 32) return showLogin("O token tem pelo menos 32 caracteres.");
  token = t;
  try {
    await api("/v1/me");
    store.set("jarvis.token", t);
    $("#token").value = "";
    await showMain();
  } catch (err) {
    token = null;
    showLogin(err.message);
  }
});

$("#logout").addEventListener("click", () => {
  token = null; conversationId = null;
  store.set("jarvis.token", null); store.set("jarvis.conversation", null);
  $("#messages").replaceChildren();
  showLogin();
});

/* ---------------- Abas ---------------- */
const titles = { chat: "Conversa", tasks: "Tarefas", memory: "Memória", settings: "Ajustes" };
document.querySelectorAll(".tabbar button").forEach((b) =>
  b.addEventListener("click", () => {
    const tab = b.dataset.tab;
    document.querySelectorAll(".tabbar button").forEach((x) => x.classList.toggle("active", x === b));
    for (const t of Object.keys(titles)) $(`#tab-${t}`).hidden = t !== tab;
    $("#title").textContent = titles[tab];
    if (tab === "tasks") loadTasks();
    if (tab === "memory") loadMemories();
    if (tab === "settings") loadSettings();
  }),
);

/* ---------------- Conversa ---------------- */
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}
function scrollDown() { const m = $("#messages"); m.scrollTop = m.scrollHeight; }

function addBubble(role, text, toolCalls = []) {
  const b = el("div", `bubble ${role}`, text);
  if (toolCalls.length) {
    const chips = el("div", "chips");
    for (const c of toolCalls) chips.append(el("span", "chip", `${c.name} · ${c.status === "ok" ? "feito" : c.status}`));
    b.append(chips);
  }
  $("#messages").append(b);
  scrollDown();
  return b;
}

function addConfirm(summary) {
  const box = el("div", "confirm");
  box.append(el("strong", null, "Confirmar ação?"), el("div", "muted", summary));
  const actions = el("div", "actions");
  const yes = el("button", "primary", "Confirmar");
  const no = el("button", null, "Cancelar");
  yes.onclick = () => { box.remove(); send("confirmo", true); };
  no.onclick = () => { box.remove(); addBubble("system", "Ação cancelada."); };
  actions.append(no, yes);
  box.append(actions);
  $("#messages").append(box);
  scrollDown();
}

async function loadConversation() {
  const box = $("#messages");
  box.replaceChildren();
  if (!conversationId) {
    addBubble("assistant", "Olá! Sou o Jarvis. Como posso ajudar?");
    return;
  }
  try {
    const { items } = await api(`/v1/conversations/${conversationId}/messages?limit=50`);
    for (const m of items) if (m.role === "user" || m.role === "assistant") addBubble(m.role, m.content);
    if (!items.length) addBubble("assistant", "Olá! Sou o Jarvis. Como posso ajudar?");
  } catch (err) {
    if (err.status === 401) return showLogin(err.message);
    conversationId = null; store.set("jarvis.conversation", null);
    addBubble("assistant", "Olá! Sou o Jarvis. Como posso ajudar?");
  }
}

async function send(text, confirm = false) {
  if (busy || !text.trim()) return;
  busy = true;
  $("#send").disabled = true;
  if (!confirm) addBubble("user", text);
  const typing = el("div", "typing", "Pensando");
  $("#messages").append(typing); scrollDown();
  try {
    const r = await api("/v1/chat", { method: "POST", body: { message: text, conversationId: conversationId || undefined, confirm } });
    conversationId = r.conversationId; store.set("jarvis.conversation", conversationId);
    typing.remove();
    if (r.reply) { addBubble("assistant", r.reply, r.toolCalls || []); speak(r.reply); }
    if (r.pendingConfirmation) addConfirm(r.pendingConfirmation.summary);
  } catch (err) {
    typing.remove();
    if (err.status === 401) return showLogin(err.message);
    addBubble("system", err.message);
  } finally {
    busy = false;
    $("#send").disabled = false;
  }
}

const input = $("#input");
input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = `${input.scrollHeight}px`; });
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); $("#chat-form").requestSubmit(); }
});
$("#chat-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const t = input.value; input.value = ""; input.style.height = "auto";
  send(t);
});

/* ---------------- Voz ---------------- */
function updateSpeakBtn() {
  const b = $("#speak-toggle");
  b.textContent = speakReplies ? "🔊" : "🔇";
  b.setAttribute("aria-pressed", String(speakReplies));
}
$("#speak-toggle").addEventListener("click", () => {
  speakReplies = !speakReplies; store.set("jarvis.speak", speakReplies ? "1" : "0"); updateSpeakBtn();
  if (!speakReplies && "speechSynthesis" in window) speechSynthesis.cancel();
});
function speak(text) {
  if (!speakReplies || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "pt-BR";
  speechSynthesis.speak(u);
}

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const mic = $("#mic");
if (!Recognition) {
  mic.hidden = true;
} else {
  let rec = null;
  mic.addEventListener("click", () => {
    if (rec) { rec.stop(); return; }
    rec = new Recognition();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (ev) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) finalText += r[0].transcript; else interim += r[0].transcript;
      }
      input.value = finalText + interim;
    };
    rec.onerror = (ev) => { if (ev.error === "not-allowed") addBubble("system", "Permita o microfone nas configurações do Safari."); };
    rec.onend = () => {
      mic.classList.remove("listening"); rec = null;
      if (finalText.trim()) { input.value = ""; send(finalText.trim()); }
    };
    mic.classList.add("listening");
    rec.start();
  });
}

/* ---------------- Tarefas ---------------- */
const fmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

async function loadTasks() {
  const ul = $("#tasks");
  try {
    const { items } = await api("/v1/tasks");
    ul.replaceChildren();
    if (!items.length) { ul.append(el("li", "empty", "Nenhuma tarefa.")); return; }
    items.sort((a, b) => (a.status === b.status ? 0 : a.status === "open" ? -1 : 1));
    for (const t of items) {
      const li = el("li", t.status === "done" ? "done" : "");
      const check = el("button", "check"); check.setAttribute("aria-label", t.status === "done" ? "Reabrir" : "Concluir");
      check.onclick = async () => {
        await api(`/v1/tasks/${t.id}`, { method: "PATCH", body: { status: t.status === "done" ? "open" : "done" } }).catch((e) => alert(e.message));
        loadTasks();
      };
      const g = el("div", "grow", t.title);
      if (t.dueAt) g.append(el("small", null, fmt.format(new Date(t.dueAt))));
      li.append(check, g);
      ul.append(li);
    }
  } catch (err) {
    if (err.status === 401) return showLogin(err.message);
    ul.replaceChildren(el("li", "empty", err.message));
  }
}
$("#task-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = $("#task-title").value.trim();
  const due = $("#task-due").value;
  if (!title) return;
  try {
    await api("/v1/tasks", { method: "POST", body: { title, dueAt: due ? new Date(due).toISOString() : undefined } });
    $("#task-title").value = ""; $("#task-due").value = "";
    loadTasks();
  } catch (err) { alert(err.message); }
});

/* ---------------- Memória ---------------- */
async function loadMemories() {
  const ul = $("#memories");
  try {
    const { items } = await api("/v1/memories?limit=100");
    ul.replaceChildren();
    if (!items.length) { ul.append(el("li", "empty", "Nada guardado ainda.")); return; }
    for (const m of items) {
      const li = el("li");
      const del = el("button", "del", "✕"); del.setAttribute("aria-label", "Apagar");
      del.onclick = async () => { await api(`/v1/memories/${m.id}`, { method: "DELETE" }).catch((e) => alert(e.message)); loadMemories(); };
      li.append(el("div", "grow", m.content), del);
      ul.append(li);
    }
  } catch (err) {
    if (err.status === 401) return showLogin(err.message);
    ul.replaceChildren(el("li", "empty", err.message));
  }
}
$("#memory-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const content = $("#memory-text").value.trim();
  if (!content) return;
  try {
    await api("/v1/memories", { method: "POST", body: { kind: "fact", content } });
    $("#memory-text").value = "";
    loadMemories();
  } catch (err) { alert(err.message); }
});

/* ---------------- Ajustes ---------------- */
async function loadSettings() {
  try {
    const u = await api("/v1/usage?days=1");
    $("#usage").textContent = `US$ ${Number(u.spentUsd).toFixed(4)} de US$ ${Number(u.limitUsd).toFixed(2)}`;
  } catch (err) { $("#usage").textContent = err.message; }
  try {
    const h = await api("/health", { auth: false });
    $("#health").textContent = `${h.dbOk ? "Banco ok" : "Banco indisponível"} · IA: ${h.providers.length ? h.providers.join(", ") : "nenhuma"} · v${h.version}`;
  } catch (err) { $("#health").textContent = err.message; }
}

/* ---------------- Início ---------------- */
updateSpeakBtn();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
if (token) showMain(); else showLogin();
