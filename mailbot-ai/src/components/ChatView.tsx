'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { IconSend } from './Icons';
import { Mascot } from './Mascot';

interface Ref { id: string; subject: string; from: string; received_at: string }
interface Msg { role: 'user' | 'assistant'; content: string; agent?: string | null; refs?: Ref[] }

const AGENT_LABEL: Record<string, string> = { triage: 'Mail Triage', summary: 'Mail Summary', chat: 'Mail Chat' };

const SUGGESTIONS = [
  'Quais e-mails são importantes hoje?',
  'Existe alguma cobrança pendente?',
  'Alguém está esperando minha resposta?',
  'Quais são meus compromissos?',
  'Existe alguma mensagem do meu trabalho?',
  'Faça um resumo dos meus últimos sete dias.',
  'Quais mensagens posso ignorar?',
  'Encontre o e-mail sobre ',
];

export function ChatView({ initial, conversationId: initialId, connected }: { initial: Msg[]; conversationId?: string; connected: boolean }) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [conversationId, setConversationId] = useState(initialId);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages, busy]);

  async function send(q: string) {
    const message = q.trim();
    if (!message || busy) return;
    setText('');
    setMessages((m) => [...m, { role: 'user', content: message }]);
    setBusy(true);
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message, conversationId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro');
      setConversationId(data.conversationId);
      setMessages((m) => [...m, { role: 'assistant', content: data.answer, agent: data.agent, refs: data.refs }]);
      if (data.conversationId && !conversationId) window.history.replaceState(null, '', `/chat?c=${data.conversationId}`);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ ${e instanceof Error ? e.message : 'Não consegui responder agora.'}` }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="chat-wrap">
      <div className="chat-log" aria-live="polite">
        {!messages.length && (
          <div className="empty enter">
            <div style={{ width: 210, height: 150, margin: '0 auto', position: 'relative' }}><Mascot /></div>
            <h3>Pergunte sobre seus e-mails</h3>
            <p>Eu pesquiso nas mensagens reais da sua conta e mostro as referências que usei.</p>
            {!connected && <p className="small" style={{ marginTop: 10 }}><Link href="/configuracoes" style={{ textDecoration: 'underline' }}>Conecte o Gmail</Link> para começar.</p>}
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => (s.endsWith(' ') ? (setText(s), inputRef.current?.focus()) : send(s))}>{s.trim()}{s.endsWith(' ') ? '…' : ''}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role === 'user' ? 'user' : 'bot'}`}>
            {m.role === 'assistant' && m.agent && <div className="agent">{AGENT_LABEL[m.agent] ?? m.agent}</div>}
            {m.content}
            {!!m.refs?.length && (
              <div className="refs">
                {m.refs.map((r, j) => (
                  <Link key={r.id} href={`/mensagens/${r.id}`} className="ref"><b>[{j + 1}]</b><span>{r.subject} — {r.from}</span></Link>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="bubble bot row" style={{ gap: 10 }}>
            <span style={{ width: 26, height: 26, position: 'relative', display: 'inline-block' }}><Mascot size="small" thinking /></span>
            <span className="typing" aria-label="Pensando"><i /><i /><i /></span>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form className="composer" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
        <label htmlFor="chat-input" className="sr-only">Mensagem</label>
        <input id="chat-input" ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} placeholder="Pergunte algo sobre seus e-mails…" maxLength={1000} autoComplete="off" />
        <button className="btn" type="submit" disabled={busy || !text.trim()} aria-label="Enviar"><IconSend /></button>
      </form>
    </div>
  );
}
