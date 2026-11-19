import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { api, ToastProvider } from './lib';
import { Analytics, Dashboard, Trends } from './pages/overview';
import { CalendarPage, CaptionEditor, MediaLibrary, Studio } from './pages/content';
import { AgentHistory, Integrations, Publications, Scheduling, SettingsPage } from './pages/ops';

const ROUTES = [
  { path: 'dashboard', label: 'Dashboard', icon: '◎', el: Dashboard },
  { path: 'tendencias', label: 'Pesquisa de tendências', icon: '🔭', el: Trends },
  { path: 'calendario', label: 'Calendário editorial', icon: '▦', el: CalendarPage },
  { path: 'criacao', label: 'Central de criação', icon: '✦', el: Studio },
  { path: 'legendas', label: 'Editor de legendas', icon: '✎', el: CaptionEditor },
  { path: 'midias', label: 'Biblioteca de mídias', icon: '▣', el: MediaLibrary },
  { path: 'agendamento', label: 'Agendamento', icon: '◷', el: Scheduling },
  { path: 'publicacoes', label: 'Publicações', icon: '↗', el: Publications },
  { path: 'analytics', label: 'Analytics', icon: '◢', el: Analytics },
  { path: 'configuracoes', label: 'Configurações', icon: '⚙', el: SettingsPage },
  { path: 'integracoes', label: 'Integrações', icon: '⇄', el: Integrations },
  { path: 'agentes', label: 'Histórico dos agentes', icon: '☰', el: AgentHistory },
];

function useHash() {
  const get = () => window.location.hash.replace(/^#\/?/, '').split('?')[0] || 'dashboard';
  const [h, setH] = useState(get);
  useEffect(() => {
    const f = () => setH(get());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return h;
}

function Login({ onLogin }: { onLogin: (u: any) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div className="login">
      <form className="card" onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr('');
        try {
          const r = await api('/api/auth/login', { method: 'POST', body: { email, password } });
          onLogin(r.user);
        } catch (x: any) {
          setErr(x.message);
        } finally {
          setBusy(false);
        }
      }}>
        <div className="brand" style={{ padding: 0 }}><div className="logo">S</div><span>SOCIAL AI</span></div>
        <p className="muted" style={{ margin: 0 }}>Agência digital autônoma para Instagram</p>
        <label>E-mail<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Senha<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {err && <div className="alert err small">{err}</div>}
        <button className="btn primary" disabled={busy} style={{ justifyContent: 'center' }}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  );
}

function App() {
  const [user, setUser] = useState<any>(undefined);
  const route = useHash();
  useEffect(() => {
    api('/api/auth/me').then((r) => setUser(r.user)).catch(() => setUser(null));
  }, []);
  if (user === undefined) return null;
  if (!user) return <Login onLogin={setUser} />;
  const R = ROUTES.find((r) => r.path === route) ?? ROUTES[0];
  const Page = R.el;
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand"><div className="logo">S</div><span>SOCIAL AI</span></div>
        <nav className="nav">
          {ROUTES.map((r) => <a key={r.path} href={`#/${r.path}`} className={r.path === R.path ? 'active' : ''}><span className="ico">{r.icon}</span><span>{r.label}</span></a>)}
        </nav>
        <div className="foot">
          <span>{user.name} · {user.role}</span>
          <button className="btn sm ghost" onClick={async () => { await api('/api/auth/logout', { method: 'POST', body: {} }); setUser(null); }}>Sair</button>
        </div>
      </aside>
      <main className="main" key={R.path}><Page /></main>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><ToastProvider><App /></ToastProvider></StrictMode>);
