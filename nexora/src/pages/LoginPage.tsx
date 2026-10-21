import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { LogOut, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSeo } from '@/hooks/useSeo';
import { useToast } from '@/hooks/useToast';
import { isSupabaseConfigured } from '@/lib/supabase';
import { fieldErrors, loginSchema } from '@/lib/validation';
import { TLink } from '@/components/ui/TLink';

export default function LoginPage() {
  const { user, role, isStaff, signIn, signUp, signOut, enterDemoStaff, loading } = useAuth();
  const [mode, setMode] = useState<'entrar' | 'criar'>('entrar');
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  useSeo({ title: 'Entrar | NEXORA Real Estate', description: 'Acesse sua conta.', path: '/entrar', noindex: true });

  if (!loading && isStaff) return <Navigate to="/admin" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const r = loginSchema.safeParse(form);
    if (!r.success) { setErrors(fieldErrors(r.error)); return; }
    setBusy(true);
    try {
      if (mode === 'entrar') { await signIn(form.email, form.password); toast.show('Bem-vindo de volta', { tone: 'success' }); navigate('/favoritos'); }
      else { const { needsConfirmation } = await signUp(form.email, form.password, form.name); toast.show(needsConfirmation ? 'Confirme seu e-mail para ativar a conta' : 'Conta criada', { tone: 'success' }); }
    } catch (err) {
      toast.show((err as Error).message, { tone: 'error' });
    } finally { setBusy(false); }
  };

  return (
    <div className="blueprint-grid flex min-h-screen items-center justify-center bg-ink px-5 pb-16 pt-[calc(var(--header-h)+2rem)] text-paper">
      <div className="w-full max-w-md">
        {user ? (
          <div className="surface p-8 text-center">
            <p className="text-lg font-medium">Você entrou como {user.email}</p>
            <p className="mt-1 text-sm text-mist">Perfil: {role}</p>
            <div className="mt-6 flex justify-center gap-2">
              <TLink to="/favoritos" className="btn-primary">Meus favoritos</TLink>
              <button type="button" className="btn-ghost" onClick={signOut}><LogOut size={15} /> Sair</button>
            </div>
          </div>
        ) : isSupabaseConfigured ? (
          <form onSubmit={submit} noValidate className="surface space-y-4 p-8">
            <h1 className="text-display-sm font-medium">{mode === 'entrar' ? 'Entrar' : 'Criar conta'}</h1>
            <p className="text-sm text-mist">Guarde favoritos na sua conta. A equipe da imobiliária acessa o painel com o mesmo login.</p>
            {mode === 'criar' && (
              <div><label htmlFor="l-name" className="field-label">Nome</label><input id="l-name" className="field" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            )}
            <div>
              <label htmlFor="l-email" className="field-label">E-mail</label>
              <input id="l-email" type="email" className="field" autoComplete="email" aria-invalid={!!errors.email} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              {errors.email && <p className="field-error">{errors.email}</p>}
            </div>
            <div>
              <label htmlFor="l-pass" className="field-label">Senha</label>
              <input id="l-pass" type="password" className="field" autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'} aria-invalid={!!errors.password} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              {errors.password && <p className="field-error">{errors.password}</p>}
            </div>
            <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}</button>
            <button type="button" className="w-full text-sm text-mist hover:text-paper" onClick={() => setMode(mode === 'entrar' ? 'criar' : 'entrar')}>{mode === 'entrar' ? 'Não tem conta? Criar agora' : 'Já tem conta? Entrar'}</button>
          </form>
        ) : (
          <div className="surface p-8">
            <ShieldCheck className="text-signal-soft" />
            <h1 className="mt-4 text-display-sm font-medium">Modo demonstração</h1>
            <p className="mt-3 text-sm leading-relaxed text-mist">
              O login real usa o Supabase, que ainda não foi configurado nesta instalação (veja o README). Enquanto isso, seus favoritos ficam salvos neste navegador.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-mist">
              Você pode abrir o painel administrativo em modo demonstração: as alterações ficam somente neste navegador e não afetam ninguém. Com o Supabase conectado, este atalho deixa de existir e o acesso passa a ser controlado pelo banco de dados.
            </p>
            <button type="button" className="btn-primary mt-6 w-full" onClick={() => { enterDemoStaff(); navigate('/admin'); }}>Abrir painel (demonstração)</button>
          </div>
        )}
      </div>
    </div>
  );
}
