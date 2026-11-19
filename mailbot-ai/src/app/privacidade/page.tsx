import Link from 'next/link';

export const metadata = { title: 'Privacidade — MAILBOT AI' };

export default function Privacidade() {
  return (
    <main className="main" style={{ paddingTop: 24 }}>
      <article className="container prose page">
        <Link href="/" className="small">← Voltar</Link>
        <h1 style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>Política de privacidade</h1>
        <p>O MAILBOT AI é um assistente pessoal que lê seus e-mails do Gmail para organizar, resumir e responder perguntas sobre eles.</p>
        <h2>O que acessamos</h2>
        <p>Somente leitura do Gmail (escopo <code>gmail.readonly</code>) e seu endereço de e-mail. Não enviamos, apagamos, arquivamos nem alteramos mensagens. Nunca solicitamos sua senha do Gmail.</p>
        <h2>O que armazenamos</h2>
        <p>Cabeçalhos (remetente, destinatários, assunto, data), o texto das mensagens (até 20 mil caracteres por mensagem; anexos não são lidos), as classificações e resumos gerados, suas conversas com o assistente, relatórios e preferências. Os tokens de acesso do Google são criptografados (AES-256-GCM).</p>
        <h2>Inteligência artificial</h2>
        <p>Trechos das mensagens são enviados ao provedor de IA (Anthropic) apenas para classificar, resumir e responder suas perguntas. Instruções contidas em e-mails nunca são executadas como comandos. O uso é limitado por um orçamento diário configurável.</p>
        <h2>Isolamento e segurança</h2>
        <p>Cada usuário só acessa os próprios dados (Row Level Security). Os registros técnicos (logs) não contêm conteúdo de e-mails nem tokens.</p>
        <h2>Seus controles</h2>
        <p>Em Configurações você pode desconectar o Gmail (revogando o acesso no Google), apagar os dados sincronizados ou excluir definitivamente toda a sua conta e dados.</p>
        <p>O uso de informações recebidas das APIs do Google obedece à Política de Dados do Usuário dos Serviços de API do Google, incluindo os requisitos de Uso Limitado.</p>
      </article>
    </main>
  );
}
