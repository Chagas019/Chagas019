# Login da Comunica+Fé (Firebase)

O site já tem o login pronto: e-mail e senha, Google, Facebook e Apple. Ele só começa a funcionar quando o site
recebe a configuração de um projeto do **Firebase** (serviço gratuito do Google). Enquanto isso, o botão **EU**
avisa que as contas ainda não foram ativadas.

Com a conta, o progresso da formação e dos desafios da câmera fica salvo e aparece em qualquer aparelho.
A senha fica guardada pelo Firebase, nunca no site.

## 1. Criar o projeto (5 minutos)

1. Abra <https://console.firebase.google.com> com a conta Google da paróquia e toque em **Criar um projeto**
   (nome sugerido: `comunica-fe`). O Google Analytics pode ficar desligado.
2. Na página do projeto, toque no ícone **`</>` (Web)** para adicionar um app da Web. Nome: `site`.
   Não marque o Firebase Hosting.
3. O Firebase mostra um bloco `firebaseConfig = { apiKey: "...", authDomain: "...", ... }`.
   **Copie esse bloco** e mande para o Claude, ou cole você mesmo no site (passo 5).
   Esses dados não são secretos: eles servem só para o site achar o projeto.

## 2. Ligar os jeitos de entrar

No menu **Authentication → Método de login (Sign-in method)**:

| Jeito de entrar | O que fazer |
| :--- | :--- |
| **E-mail/senha** | Ativar. Pronto. |
| **Google** | Ativar, escolher o e-mail de suporte e salvar. Pronto. |
| **Facebook** | Precisa de um app em <https://developers.facebook.com> (tipo “Consumidor”, produto **Login do Facebook**). Copie o **ID do app** e a **Chave secreta** para o Firebase, e cole a **URI de redirecionamento** que o Firebase mostra em *Login do Facebook → Configurações → URIs de redirecionamento do OAuth válidos*. Depois coloque o app do Facebook no modo **Ao vivo**. |
| **Apple** | Exige uma conta paga do **Apple Developer Program** (US$ 99 por ano). Siga o guia que o Firebase mostra ao ativar a Apple: criar um *Services ID*, uma chave *Sign in with Apple* e cadastrar o domínio. |

Se algum jeito não for ativado (por exemplo, a Apple), avise o Claude ou tire da lista `provedores` no passo 5,
para o botão não aparecer.

## 3. Autorizar o endereço do site

Em **Authentication → Configurações → Domínios autorizados**, adicione:

- `comunica-fe.vercel.app`

(e qualquer domínio próprio que a paróquia venha a usar).

## 4. Criar o banco do progresso

1. Menu **Firestore Database → Criar banco de dados**, modo de produção, região `southamerica-east1` (São Paulo).
2. Aba **Regras**: apague o que estiver lá, cole o conteúdo do arquivo [`firestore.rules`](firestore.rules)
   deste repositório e toque em **Publicar**. Com essas regras, cada pessoa só vê e grava o próprio progresso.

## 5. Colocar a configuração no site

Em `site/pagina.html`, procure a linha:

```js
const FIREBASE_CONFIG = window.COMUNICAFE_FIREBASE || null;
```

e troque `null` pelo bloco copiado no passo 1, acrescentando a lista dos jeitos de entrar que você ativou:

```js
const FIREBASE_CONFIG = window.COMUNICAFE_FIREBASE || {
  apiKey: "...",
  authDomain: "comunica-fe.firebaseapp.com",
  projectId: "comunica-fe",
  appId: "...",
  provedores: ["senha", "google", "facebook", "apple"],
};
```

Depois rode `bash scripts/montar-site.sh` e publique de novo. Pelo Claude, basta mandar o bloco do passo 1 e
dizer quais jeitos de entrar foram ativados.

## Dentro do Claude

Quando o site é aberto pelo link do Claude, quem pode publicar continua sendo definido pela conta do Claude.
O login do Firebase vale para o site publicado (Vercel).
