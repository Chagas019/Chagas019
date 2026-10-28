# Login, equipe e IA da Comunica+Fé

## Contas do próprio site (já ativas no Vercel)

O site publicado (<https://comunica-fe.vercel.app>) tem um banco de dados próprio: um **Blob privado do Vercel**
chamado `comunica-fe-dados`, ligado ao projeto `comunica-fe` pela variável `BLOB_READ_WRITE_TOKEN`.

- **Entrar**: a pessoa usa o **e-mail** ou um **nome de usuário** que ela inventa, mais uma senha (mínimo 6 caracteres).
  Não precisa de Google, Facebook nem confirmar nada por e-mail.
- **A primeira conta criada vira coordenação.** Crie a sua logo depois da publicação, antes de divulgar o site.
- As outras contas entram como **visitantes**. Em **Perfil → Contas e acessos**, a coordenação escolhe o papel de
  cada pessoa: Visitante, Equipe (publica agenda, escala, frases e coberturas) ou Coordenação (tudo, inclusive
  avisos, integrantes e acessos).
- **Esqueceu a senha?** Não tem e-mail de recuperação: a coordenação toca em **Senha provisória** na lista de contas
  e passa a senha para a pessoa, que entra e troca em **Perfil → Trocar minha senha**.
- A agenda, as escalas, os avisos, as frases, os integrantes e as coberturas ficam no mesmo banco, iguais para
  todo mundo. O site busca as novidades a cada 25 segundos.
- O progresso da formação e dos desafios da câmera fica salvo na conta de cada pessoa.

### Segurança

- A senha é guardada só como hash (scrypt, com sal). Ninguém, nem a coordenação, consegue ler a senha.
- A sessão é um token assinado no servidor, que vale 60 dias. Trocar ou redefinir a senha derruba as sessões antigas.
- A chave de assinatura vem de `SESSAO_SEGREDO`, se existir; se não, é derivada do `BLOB_READ_WRITE_TOKEN`
  (que só existe no servidor).
- Limites: 8 senhas erradas por login a cada 15 minutos, e 6 contas novas por endereço por hora.
- As permissões de cada coleção estão em `api/dados.mjs` (as mesmas regras do `firestore.rules`).

### Arquivos

| Arquivo | O que faz |
| :--- | :--- |
| `api/conta.mjs` | criar conta, entrar, progresso, trocar senha, lista de contas, papel e senha provisória |
| `api/dados.mjs` | ler e gravar as coleções |
| `api/_lib/armazem.mjs` | leitura e gravação no Blob, com proteção para duas pessoas salvando ao mesmo tempo |
| `api/_lib/sessao.mjs` | senhas, tokens e conta de quem fez o pedido |
| `api/_lib/blob.mjs` | a biblioteca `@vercel/blob` 2.8.2 num arquivo só (o projeto publica sem etapa de instalação) |

Os testes ficam em `tests/servidor.test.mjs` (banco na memória) e no grupo 21 de `tests/e2e.js`.

## IA do Criador de conteúdo

O Criador de conteúdo usa a API do Claude (Anthropic). A chave fica só no servidor do Vercel: ela nunca vai para o
navegador. Só quem está na **equipe** (conta do site) consegue usar a IA, e cada pessoa tem um limite de
20 pedidos por hora.

1. Crie uma chave em <https://console.anthropic.com> (**API Keys**). O uso é cobrado pela Anthropic.
2. No Vercel, abra o projeto `comunica-fe` → **Settings → Environment Variables** e crie `ANTHROPIC_API_KEY`
   com a chave.
3. Publique o site de novo (**Deployments → Redeploy**). A aba **Criador de conteúdo** passa a mostrar “IA ativa”.

Sem a chave, o Criador funciona no modo “Copiar pedido” (cola-se o pedido em qualquer assistente de IA), e dentro do
link do Claude ele usa a IA do próprio Claude.

## Firebase (opcional)

O site ainda aceita o Firebase no lugar do banco do Vercel. Para isso, preencha `FIREBASE_CONFIG` em
`site/pagina.html` com o `firebaseConfig` de um projeto do Firebase, publique o `firestore.rules` e crie a variável
`FIREBASE_PROJECT_ID` no Vercel. Com o Firebase configurado, ele passa a ser usado no lugar do banco do Vercel,
com os jeitos de entrar que forem ativados lá.

## Dentro do Claude

Quando o site é aberto pelo link do Claude, quem pode publicar é definido pela conta do Claude, e os dados ficam no
banco do próprio Claude. As contas do site valem para o site publicado (Vercel).
