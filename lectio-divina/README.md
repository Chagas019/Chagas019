# Lectio Divina Diária

Site com a Lectio Divina de cada dia. Feito com React, Vite, Tailwind CSS e lucide-react.

- **Abertura** em tela cheia, com vídeo de fundo. Mostra a data de hoje, a referência do Evangelho do dia e quantos dias seguidos a pessoa já rezou.
- **O Evangelho de hoje** aparece sozinho todo dia, com as outras leituras e o salmo logo abaixo.
- **Preparar a homilia**: um roteiro montado automaticamente a partir das leituras do dia (`src/lib/homily.ts`). Destaca frases do Evangelho (copiadas do próprio texto), explica o evangelista e o tempo litúrgico, e guia em 5 passos: abertura, o que o texto diz, ligação com as outras leituras, atualização e convite final. O esboço pode ser copiado com um toque, e a pessoa não precisa escrever nada.
- **Calendário** do mês: hoje fica destacado e os dias com a homilia preparada ganham uma marca. Tocar num dia abre o Evangelho e o roteiro daquela data.
- **Lembrete**: cria um compromisso diário no horário escolhido, no Google Agenda ou num arquivo `.ics` (iPhone e Outlook).

## Como atualiza todo dia

O dia muda à meia-noite de Brasília, também quando a pessoa volta para a aba. A liturgia é buscada assim:

1. cache do navegador (`localStorage`);
2. `GET /api/lectio?data=aaaa-mm-dd`, uma função da Vercel (`api/lectio.js`) que tenta, nesta ordem, duas fontes públicas:
   - [API Liturgia Diária](https://github.com/Dancrf/liturgia-diaria): `https://liturgia.up.railway.app/v2/?dia=16&mes=10&ano=2026`;
   - reserva: API das Edições CNBB (a que alimenta liturgiadiaria.edicoescnbb.com.br): `https://api-liturgia.edicoescnbb.com.br/contents/in/date/2026-10-16`.

   A resposta fica 12 h em cache na CDN, e o site mostra de qual fonte vieram os textos;
3. se a função não responder (por exemplo, no `npm run dev`), a API Liturgia Diária é chamada direto pelo navegador.

Nada fica gravado no repositório, então não há tarefa agendada para manter. Para trocar a fonte, defina `LITURGIA_API` na função e/ou `VITE_LITURGIA_API` no site.

## Rodar e publicar

```bash
npm install
npm run dev     # http://localhost:5173 (sem a função /api; usa a API direto)
npm test
npm run build
```

Para publicar na Vercel, importe o repositório com **Root Directory = `lectio-divina`**. O framework Vite é detectado sozinho e a pasta `api/` vira a função.
