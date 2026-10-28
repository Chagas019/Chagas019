---
name: database-modeling
description: Modela tabelas, relações, índices, migrações e políticas de acesso (incluindo RLS no Postgres/Supabase). Use ao criar ou alterar um schema de banco, escrever migrações, otimizar consultas lentas ou definir quem pode ler e escrever cada dado.
---

# Database Modeling

## Modelagem
- Comece pelas entidades e relações do domínio (1:1, 1:N, N:N com tabela de junção).
- Normalize até a 3ª forma normal; desnormalize só com motivo medido (leitura pesada).
- Chave primária: `uuid` ou `bigint identity`. Chaves estrangeiras sempre declaradas, com `ON DELETE` pensado.
- Tipos certos: `timestamptz` para datas, `numeric` para dinheiro, `text` com `CHECK` ou `enum` para status, `jsonb` só para dados realmente flexíveis.
- Colunas padrão: `id`, `created_at`, `updated_at`; `deleted_at` se houver soft delete.
- Restrições no banco: `NOT NULL`, `UNIQUE`, `CHECK`. O banco é a última linha de defesa.

## Índices
- Índice em toda chave estrangeira e nas colunas de `WHERE`, `JOIN` e `ORDER BY` frequentes.
- Índices compostos na ordem de seletividade e de uso; parciais para filtros fixos (`WHERE deleted_at IS NULL`).
- Confirme com `EXPLAIN ANALYZE`; não crie índice sem consulta que o use.

## Migrações
- Uma mudança por migração, versionada no repositório e reversível quando possível.
- Mudanças sem downtime: adicionar coluna nullable → preencher → tornar NOT NULL; renomear em duas etapas.
- Nunca edite uma migração já aplicada em produção; crie outra.
- Teste a migração em uma cópia antes de produção e faça backup antes de mudanças destrutivas.

## Políticas de acesso
- Princípio do menor privilégio: papéis separados para app, leitura e admin.
- Supabase/Postgres: ative RLS em **toda** tabela exposta e escreva políticas por operação (`select`, `insert`, `update`, `delete`) usando `auth.uid()`.
- Teste as políticas com usuários diferentes (dono, outro usuário, anônimo).
- A chave de serviço (`service_role`) nunca vai para o frontend.

## Consultas
- Evite N+1 (use join ou carregamento em lote); selecione só as colunas necessárias; pagine.
