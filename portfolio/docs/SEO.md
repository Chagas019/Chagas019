# SEO — CHAGAS CREATIVE

Página única, público local (Campinas e região — SP). Domínio ainda não definido: `robots.txt`, `sitemap.xml`, canonical e `og:url` usam **`https://SEU-DOMINIO`** — trocar tudo de uma vez (busca global) quando houver domínio, e preencher `site.url` em `content/portfolio.json`.

## Palavras-chave
- **Principais (locais):** fotógrafo Campinas · videomaker Campinas · fotografia de eventos Campinas · filmagem de eventos Campinas
- **Serviços:** fotógrafo de 15 anos Campinas · fotógrafo de casamento Campinas · ensaio fotográfico Campinas · aftermovie · edição de Reels · motion design · identidade visual
- **Nicho:** comunicação para igrejas · fotógrafo católico · PASCOM / pastoral da comunicação · cobertura de retiros e eventos religiosos
- **Produtos:** presets Lightroom · LUTs Blackmagic Camera
- Usar variações naturalmente no texto; não repetir termos nem criar blocos de palavras-chave.

## Title e description (propostas)
- `<title>` (≤ 60): **CHAGAS CREATIVE | Fotógrafo e videomaker em Campinas**
- `meta description` (≤ 155): **Fotografia, audiovisual, design e comunicação digital em Campinas e região. Eventos, ensaios, 15 anos, casamentos, Reels e comunicação para igrejas.**
- Open Graph/Twitter: mesmo título e descrição; `og:image` 1200×630 (faltante); `og:locale` pt_BR; `og:type` website.
- `<html lang="pt-BR">` e `<link rel="canonical" href="https://SEU-DOMINIO/">`.

## Hierarquia de títulos
- **1 único `h1`:** o título do hero ("Criatividade que transforma ideias em experiências."). Incluir a localização perto dele (subtítulo ou rótulo "Campinas e região — SP").
- **`h2` por seção:** Sobre · Serviços · Portfólio · Projetos · Produtos · Orçamento · Contato. Preferir `h2` descritivos quando couber (ex.: "Serviços de fotografia, vídeo e design").
- **`h3`:** cada área, trabalho, projeto selecionado, produto e grupo de preços.
- Caixa alta só via CSS (`text-transform`); no HTML, texto normal.

## JSON-LD (no `<head>`)
- `ProfessionalService` (ou `LocalBusiness`): `name` CHAGAS CREATIVE, `founder` Person "Francisco das Chagas Cardoso", `areaServed` Campinas e região, `address` só com `addressLocality: Campinas`, `addressRegion: SP`, `addressCountry: BR` (sem endereço de rua: não informado), `telephone` +55 19 98990-5361, `email`, `sameAs` [Instagram], `url` = domínio, `foundingDate` 2019.
- `makesOffer` / `hasOfferCatalog` com os itens de `pricing.json` como `Offer` + `priceSpecification` (`minPrice`, `priceCurrency` BRL). Só incluir preços que estão no site.
- **Não** incluir `aggregateRating`, `review` ou `openingHours`: não há dados reais.
- Gerar a partir do JSON ou manter estático em sincronia com `pricing.json`.

## Imagens: regras de `alt`
- Descrever o que se vê + contexto em 1 frase (≤ 125 caracteres). Ex.: "Noiva entrando na igreja, fotografada do fundo da nave".
- Não começar com "Imagem de"/"Foto de"; não encher de palavras-chave; não inventar nome de cliente ou evento.
- Placeholders e decorativos: `alt=""` (+ `aria-hidden` se for só ornamento).
- Nome de arquivo descritivo (`eventos-lual-mariano-01.avif`), `width`/`height` sempre declarados, `loading="lazy"` abaixo da dobra, AVIF/WebP via `media/`.

## SEO local
- Criar/reivindicar o **Perfil da Empresa no Google** (Google Business Profile): categoria "Fotógrafo" + secundárias "Videógrafo", "Designer gráfico"; área de atendimento Campinas e região (ocultar endereço se for atendimento em domicílio); site, WhatsApp, horário só se real.
- Publicar fotos reais no perfil e pedir avaliações a clientes reais (nunca criar).
- NAP idêntico em todo lugar: "CHAGAS CREATIVE · Campinas – SP · +55 19 98990-5361".
- Link do site na bio do Instagram @chagas_catolico.

## Próximos passos
1. Definir domínio → substituir `SEU-DOMINIO`, enviar sitemap no Google Search Console.
2. Subir fotos reais por categoria (tirar categorias de "Em curadoria") com `alt` bons.
3. Criar `og:image` 1200×630 e o Perfil da Empresa no Google.
4. Medir Core Web Vitals (LCP do hero < 2,5 s) após trocar as mídias.
5. Futuro: páginas próprias por serviço (ex.: `/fotografia-de-eventos-campinas/`) quando houver portfólio suficiente — atualizar o sitemap.
