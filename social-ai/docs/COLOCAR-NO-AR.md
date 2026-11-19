# Colocar o SOCIAL AI no ar para o @chagas_catolico

O sistema já vem pronto com o **perfil católico** (marca "Chagas Católico", azul-noite e dourado, pilares de Evangelho do dia, santo do dia, catequese, oração, Bíblia, liturgia diária e regras de fidelidade à doutrina).

Só faltam as etapas que **dependem da sua conta e da sua assinatura** (ninguém pode fazer por você, por segurança). Tempo total: uns 40 minutos.

---

## Etapa 1 — Deixar o Instagram pronto (no celular, 5 min)

1. Instagram → seu perfil → ☰ → **Configurações e privacidade** → **Tipo de conta e ferramentas** → **Mudar para conta profissional** → escolha **Criador de conteúdo** (ou Empresa) → categoria "Comunidade religiosa" ou "Criador digital".
2. Ainda nas configurações → **Central de Contas** → **Contas** → adicione sua conta do Facebook.
3. No Facebook, crie uma **Página** (ex.: "Chagas Católico") e, nas configurações da Página → **Contas vinculadas** → **Instagram** → conecte o @chagas_catolico.

## Etapa 2 — Chave do Claude (5 min)

1. Acesse **console.anthropic.com** → crie a conta → **Billing** (adicione créditos; uns US$ 20 dão para bastante tempo) → **API Keys** → **Create Key**.
2. Guarde a chave (começa com `sk-ant-`). Ela vai no Render na etapa 3. **Não envie essa chave em chat nenhum.**

## Etapa 3 — Colocar o sistema no ar no Render (10 min)

1. Acesse **render.com** e entre com sua conta do GitHub.
2. Abra: **https://render.com/deploy?repo=https://github.com/Chagas019/Chagas019**
   (o Render lê o arquivo `render.yaml` do repositório; se o projeto ainda estiver só no PR, primeiro faça o merge dele no GitHub.)
3. Preencha os campos pedidos:
   - `ADMIN_EMAIL`: seu e-mail (login do painel)
   - `ADMIN_PASSWORD`: uma senha forte com 12+ caracteres
   - `ANTHROPIC_API_KEY`: a chave da etapa 2
   - `META_APP_ID` e `META_APP_SECRET`: deixe em branco por enquanto (etapa 4)
4. Clique em **Apply**. Plano **Starter** (~US$ 7/mês) — necessário para o disco que guarda o banco e as mídias.
5. Quando terminar, o Render mostra o endereço, algo como `https://chagas-social-ai.onrender.com`. Abra e faça login.

Os segredos internos (`ENCRYPTION_KEY`, `SESSION_SECRET`) são gerados sozinhos, e o endereço público é detectado automaticamente.

## Etapa 4 — App da Meta para publicar (15 min)

1. Acesse **developers.facebook.com** → **Meus apps** → **Criar app** → tipo **Empresa** (Business).
2. No app → **Adicionar produto** → **Instagram** → **API com Login do Facebook**.
3. **Login do Facebook → Configurações** → em *URIs de redirecionamento do OAuth válidos* cole:
   `https://SEU-ENDERECO.onrender.com/api/instagram/oauth/callback`
4. **Configurações do app → Básico**: copie o **ID do app** e a **Chave secreta**.
5. No Render → seu serviço → **Environment** → preencha `META_APP_ID` e `META_APP_SECRET` → **Save** (ele reinicia sozinho).
6. Enquanto o app estiver em *modo de desenvolvimento*, ele funciona para a sua própria conta (você é o administrador do app) — não precisa de revisão da Meta para publicar no seu perfil.

## Etapa 5 — Conectar e ligar (5 min, no painel)

1. **Integrações → Conectar com Facebook** → entre com o Facebook dono da Página → autorize tudo.
2. **Verificar conta** → todos os itens devem ficar ✅.
3. **Confirmar permissões** → **Analisar perfil** → **Confirmar nicho**.
4. **Dashboard → Rodar pipeline agora** e confira o resultado na **Central de criação** (aprove ou reprove).
5. Quando estiver satisfeito:
   - No Render → Environment → `ALLOW_PUBLISHING` = `true` → Save.
   - No painel → **Integrações → Ativar modo de produção** → digite `ATIVAR PRODUÇÃO`.

Pronto. A partir daí, todo dia:

| Horário | O que acontece |
|---|---|
| 04:30–06:00 | Liturgia do dia (Canção Nova/CNBB/Vatican News), tendências, estratégia, textos e artes |
| 07:30 | Post de feed (alternando carrossel e imagem) |
| 08:00 · 12:00 · 15:00 · 18:00 · 21:00 | Stories do Evangelho do dia |
| 19:00 | Reel |
| 22:30 | Coleta de métricas e relatório (semanal aos domingos) |

A **aprovação humana** vem ligada: você recebe os conteúdos em *Central de criação* e aprova com um clique. Para deixar 100% automático: **Configurações → Aprovação humana → Automática após QA**.

**Emergência:** no Dashboard, o botão **Pausa de emergência** para tudo na hora.

## Custos estimados

- Render Starter + disco: ~US$ 8/mês
- Claude: ~US$ 10–30/mês (depende do volume)
- Instagram/Meta: grátis
