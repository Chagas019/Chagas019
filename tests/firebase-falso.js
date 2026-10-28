// Firebase de mentira para testes: guarda contas e documentos em memória
window.COMUNICAFE_FIREBASE = { apiKey: "teste", authDomain: "teste.firebaseapp.com", projectId: "teste", appId: "1:1:web:1" };
(() => {
  const users = {}, docs = {}, cbs = []; let atual = null;
  const err = code => Object.assign(new Error(code), { code });
  const set = u => { atual = u; cbs.forEach(cb => cb(u)); };
  const mk = (email, nome, prov) => ({ uid: "u_" + email, email, displayName: nome || null, providerData: [{ providerId: prov }], updateProfile: async function (p) { this.displayName = p.displayName; }, getIdToken: async () => "token-de-teste" });
  const auth = {
    onAuthStateChanged(cb) { cbs.push(cb); setTimeout(() => cb(atual), 0); },
    async createUserWithEmailAndPassword(e, s) { if (users[e]) throw err("auth/email-already-in-use"); users[e] = { s, u: mk(e, null, "password") }; set(users[e].u); return { user: users[e].u }; },
    async signInWithEmailAndPassword(e, s) { if (!users[e] || users[e].s !== s) throw err("auth/invalid-credential"); set(users[e].u); return { user: users[e].u }; },
    async signInWithPopup(p) { window.__ultimoProv = p.id; const u = mk("fiel@gmail.com", "Fiel Teste", p.id); set(u); return { user: u }; },
    async signInWithRedirect() {}, async getRedirectResult() { return null; },
    async signOut() { set(null); }, async sendPasswordResetEmail(e) { window.__reset = e; }, useDeviceLanguage() {},
  };
  function Prov(id) { this.id = id; this.addScope = () => {}; }
  window.firebase = {
    apps: [], initializeApp(c) { this.apps.push(c); return {}; },
    auth: Object.assign(() => auth, { GoogleAuthProvider: function () { return new Prov("google.com"); }, FacebookAuthProvider: function () { return new Prov("facebook.com"); }, OAuthProvider: function (id) { return new Prov(id); } }),
    firestore: () => fs,
  };
  // Firestore em memória com uma versão simplificada das regras de firestore.rules
  const subs = {};
  const papelDe = () => atual && docs["equipe/" + atual.uid] ? docs["equipe/" + atual.uid].papel : null;
  const PUBLICAS = ["agenda", "escalas", "avisos", "frases", "formacao"], COORD = ["avisos", "membros", "equipe", "formacao"];
  const podeLer = c => PUBLICAS.includes(c) || (c === "usuarios" ? !!atual : !!papelDe());
  const podeGravar = (c, id) => c === "usuarios" ? !!atual && atual.uid === id : COORD.includes(c) ? papelDe() === "coordenacao" : !!papelDe();
  const linhas = c => Object.entries(docs).filter(([k]) => k.startsWith(c + "/")).map(([k, d]) => ({ id: k.slice(c.length + 1), exists: true, data: () => d }));
  const emitir = c => (subs[c] || []).forEach(s => s.ok({ docs: linhas(c) }));
  const fs = { collection: c => ({
    onSnapshot(ok, falha) {
      if (!podeLer(c)) { setTimeout(() => falha && falha(err("permission-denied")), 0); return () => {}; }
      const s = { ok }; (subs[c] ||= []).push(s); setTimeout(() => ok({ docs: linhas(c) }), 0);
      return () => { subs[c] = subs[c].filter(x => x !== s); };
    },
    doc: id => ({
      async get() { if (c !== "equipe" && !podeLer(c)) throw err("permission-denied"); const d = docs[c + "/" + id]; return { exists: !!d, data: () => d }; },
      async set(d, o) { if (!podeGravar(c, id)) throw err("permission-denied"); docs[c + "/" + id] = o && o.merge ? { ...(docs[c + "/" + id] || {}), ...d } : d; emitir(c); },
      async delete() { if (!podeGravar(c, id)) throw err("permission-denied"); delete docs[c + "/" + id]; emitir(c); },
    }),
  }) };
  window.__fbDocs = docs; window.__fbUsers = users;
})();
