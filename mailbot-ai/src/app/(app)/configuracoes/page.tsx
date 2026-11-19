import Link from 'next/link';
import { DeleteAccount, DisconnectGmail, PreferencesForm, type PrefsValue } from '@/components/SettingsForms';
import { SyncButton } from '@/components/SyncButton';
import { IconMail, IconShield } from '@/components/Icons';
import { pageContext } from '@/lib/server/queries';
import { missingConfig } from '@/lib/env';
import { fmtFull, relative } from '@/lib/ui/format';

export const dynamic = 'force-dynamic';

const MESSAGES: Record<string, { kind: 'ok' | 'err' | 'warn'; text: string }> = {
  connected: { kind: 'ok', text: 'Gmail conectado! A sincronização inicial começou.' },
  denied: { kind: 'warn', text: 'Você cancelou a autorização do Google.' },
  missing_scope: { kind: 'err', text: 'A permissão de leitura do Gmail não foi concedida. Tente novamente e marque a caixa de acesso ao Gmail.' },
  no_refresh_token: { kind: 'err', text: 'O Google não enviou o token de acesso contínuo. Remova o acesso do MAILBOT em myaccount.google.com/permissions e conecte de novo.' },
  invalid_state: { kind: 'err', text: 'A sessão de autorização expirou. Tente conectar novamente.' },
  error: { kind: 'err', text: 'Não foi possível conectar ao Gmail. Tente novamente.' },
};

export default async function Configuracoes({ searchParams }: { searchParams: Promise<{ gmail?: string }> }) {
  const { gmail } = await searchParams;
  const { sb, user, account, prefs, tz } = await pageContext();
  const { data: syncs } = await sb.from('mailbot_sync_history').select('kind,status,added,updated,deleted,error,started_at').order('started_at', { ascending: false }).limit(5);
  const missing = missingConfig();
  const notice = gmail ? MESSAGES[gmail] : undefined;
  const connected = account?.status === 'connected';

  return (
    <div className="page">
      <div className="topbar"><h1>Configurações</h1></div>
      {notice && <div className={`notice ${notice.kind} enter`} style={{ marginBottom: 12 }}>{notice.text}</div>}
      {missing.length > 0 && <div className="notice warn enter" style={{ marginBottom: 12 }}>Configuração do servidor incompleta: {missing.join(', ')}. Veja o README.</div>}

      <div className="card enter enter-1">
        <h2 className="card-title">Conta Gmail</h2>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <span className="icon-btn" style={{ flexShrink: 0 }}><IconMail /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row" style={{ gap: 8 }}>
              <span className={`status-dot ${connected ? '' : account?.status === 'reauth_required' ? 'warn' : 'off'}`} />
              <b style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{account && account.status !== 'disconnected' ? account.email : 'Nenhuma conta conectada'}</b>
            </div>
            <p className="small muted" style={{ margin: '4px 0 0' }}>
              {connected ? `Última sincronização ${relative(account!.last_sync_at)}${account!.initial_sync_done ? '' : ' · sincronização inicial em andamento'}` :
                account?.status === 'reauth_required' ? 'A autorização expirou ou foi revogada. Reconecte para continuar.' :
                'Acesso somente leitura (gmail.readonly). O MAILBOT nunca envia nem apaga e-mails.'}
            </p>
          </div>
        </div>
        <div className="divider" />
        {connected ? (
          <div className="stack">
            <SyncButton auto={gmail === 'connected' || !account!.initial_sync_done} />
            <DisconnectGmail />
          </div>
        ) : (
          <a className="btn" href="/api/gmail/connect">{account?.status === 'reauth_required' ? 'Reconectar Gmail' : 'Conectar Gmail'}</a>
        )}
        {!!syncs?.length && (
          <>
            <div className="divider" />
            <h3 className="card-title" style={{ marginBottom: 4 }}>Histórico de sincronização</h3>
            <ul className="list-plain">
              {syncs.map((s, i) => (
                <li key={i} className="row between tiny"><span>{fmtFull(s.started_at, tz)} · {s.kind === 'initial' ? 'inicial' : s.kind === 'incremental' ? 'incremental' : 'completa'}</span>
                  <span className="faint">{s.status === 'error' ? `erro${s.error === 'reauth_required' ? ': reautorizar' : ''}` : `+${s.added} · ~${s.updated} · −${s.deleted}`}</span></li>
              ))}
            </ul>
          </>
        )}
      </div>

      {prefs && <PreferencesForm initial={{ ...(prefs as PrefsValue), ai_daily_budget_usd: Number(prefs.ai_daily_budget_usd) }} />}

      <div className="card enter enter-4" style={{ marginTop: 12 }}>
        <h2 className="card-title">Segurança e privacidade</h2>
        <ul className="list-plain small muted">
          <li className="row"><IconShield width={16} height={16} /> Tokens do Google criptografados (AES-256-GCM); senha do Gmail nunca é solicitada.</li>
          <li className="row"><IconShield width={16} height={16} /> Seus dados são isolados por usuário (Row Level Security no banco).</li>
          <li className="row"><IconShield width={16} height={16} /> Instruções dentro de e-mails nunca são executadas pela IA.</li>
        </ul>
        <div className="row wrap" style={{ marginTop: 8 }}>
          <Link href="/privacidade" className="btn btn-ghost btn-sm">Política de privacidade</Link>
          <form action="/auth/signout" method="post"><button className="btn btn-ghost btn-sm">Sair ({user.email})</button></form>
        </div>
      </div>

      <div className="card enter enter-5" style={{ marginTop: 12 }}>
        <h2 className="card-title">Gerenciamento de dados</h2>
        <DeleteAccount />
      </div>
    </div>
  );
}
