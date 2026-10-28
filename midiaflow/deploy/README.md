# Publicação na Vercel (sem integração GitHub)

A Vercel recebe só os três arquivos desta pasta. Na hora do build, `vercel-build.sh`
baixa o código do repositório público no commit indicado em `SHA`, instala, testa os tipos,
gera o site e entrega `dist/`.

Configuração do projeto `midiaflow` na Vercel:
- Install Command: `echo sem-dependencias`
- Build Command: `sh vercel-build.sh`
- Output Directory: `dist`
- Variáveis (para login e banco): `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`

Com a integração GitHub instalada, nada disso é necessário: conecte o repositório com
Root Directory `midiaflow` e cada push publica sozinho.
