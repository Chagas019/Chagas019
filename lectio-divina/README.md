# Lectio Divina Diária

Site com a Lectio Divina de cada dia. Feito com React, Vite, Tailwind CSS e lucide-react.

- **Abertura** em tela cheia, com vídeo de fundo. Mostra a data de hoje, a referência do Evangelho do dia e quantos dias seguidos a pessoa já rezou.
- **A Lectio de hoje** traz o Evangelho do dia e os passos *Lectio, Meditatio, Oratio, Contemplatio e Actio*. Tem um campo para anotações, que ficam só no aparelho, um timer de 3 minutos de silêncio e um botão "Concluí". As outras leituras e o salmo ficam logo abaixo.
- **Calendário** do mês: hoje fica destacado e os dias concluídos ganham uma marca. Tocar num dia abre a Lectio daquela data. Também mostra os dias seguidos e quantas Lectios foram feitas no mês.
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
