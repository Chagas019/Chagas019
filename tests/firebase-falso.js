// Firebase de mentira para testes: guarda contas e documentos em memória
window.COMUNICAFE_FIREBASE = { apiKey: "teste", authDomain: "teste.firebaseapp.com", projectId: "teste", appId: "1:1:web:1" };
(() => {
  const users = {}, docs = {}, cbs = []; let atual = null;
  const err = code => Object.assign(new Error(code), { code });
  const set = u => { atual = u; cbs.forEach(cb => cb(u)); };
  const mk = (email, nome, prov) => ({ uid: "u_" + email, email, displayName: nome || null, providerData: [{ providerId: prov }], updateProfile: async function (p) { this.displayName = p.displayName; } });
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
    firestore: () => ({ collection: c => ({ doc: id => ({
      async get() { const d = docs[c + "/" + id]; return { exists: !!d, data: () => d }; },
      async set(d, o) { docs[c + "/" + id] = o && o.merge ? { ...(docs[c + "/" + id] || {}), ...d } : d; },
    }) }) }),
  };
  window.__fbDocs = docs; window.__fbUsers = users;
})();
