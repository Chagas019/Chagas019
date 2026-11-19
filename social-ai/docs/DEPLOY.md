# Deploy em produção

## Requisitos

- Servidor com Docker (ou Node.js 22.13+ e FFmpeg).
- Domínio com **HTTPS** (a Graph API baixa as mídias por URL pública).
- Volume persistente para `/data` (banco, mídias e backups).

## Passo a passo (Docker)

```bash
cd social-ai
cp .env.example .env
# gere os segredos:
npm run key:generate   # → ENCRYPTION_KEY
npm run key:generate   # → SESSION_SECRET (ou qualquer string aleatória >= 32 caracteres)
# preencha ANTHROPIC_API_KEY, META_*, PUBLIC_BASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD
docker compose up -d --build
docker compose logs -f
```

Coloque um proxy reverso com TLS na frente (Caddy, Nginx, Traefik, Cloudflare Tunnel). Exemplo Caddy:

```
social.seudominio.com.br {
  reverse_proxy 127.0.0.1:8080
}
```

## Sem Docker

```bash
npm ci && npm run build
NODE_ENV=production node --disable-warning=ExperimentalWarning dist/main.js
```
Use systemd/pm2 para manter o processo ativo.

## Checklist de entrada em produção

1. `/api/health` responde via `PUBLIC_BASE_URL`.
2. Login com o admin inicial; troque/crie usuários (`npm run admin:create`).
3. **Integrações → Verificar tudo**: Claude, FFmpeg, URL pública.
4. Conectar Instagram → Verificar conta → Confirmar permissões → Confirmar nicho.
5. Revisar **Configurações** (rotina, frequência, horários, marca, regras).
6. Rodar o pipeline manualmente e revisar o resultado na Central de criação.
7. Definir `ALLOW_PUBLISHING=true`, reiniciar e ligar **Modo de produção** no painel.
8. Manter a aprovação humana ligada nas primeiras semanas.

## Backups

- Automático diário às 03:00 em `BACKUP_DIR` (14 cópias, `VACUUM INTO` consistente).
- Manual: `npm run backup` (ou `docker compose exec social-ai node dist/cli/backup.js`).
- Copie também `STORAGE_DIR/media` (mídias geradas) para um storage externo (S3/R2) com a ferramenta da sua preferência (ex.: `rclone sync`).
- Restauração: pare o serviço, substitua `DATABASE_PATH` pelo arquivo de backup, inicie.

## Tokens

O token de longa duração da Meta vale ~60 dias. A tela de Integrações mostra os dias restantes (a verificação marca pendência com ≤ 3 dias). Reconecte pelo botão "Conectar com Facebook" antes do vencimento.

## Escala

SQLite em WAL atende uma instância com folga (uma conta, dezenas de tarefas/dia). Para múltiplas instâncias ou muitas contas, migre a camada `src/db` para PostgreSQL (o SQL é padrão) e mantenha **um único** scheduler ativo (`SCHEDULER_ENABLED=true` em apenas uma réplica; workers podem escalar).

## Observabilidade

- Logs JSON no stdout (com segredos removidos) + tabela `agent_logs` visível em *Histórico dos agentes*.
- Trilha de auditoria em `audit_logs` (`GET /api/audit`, admin).
