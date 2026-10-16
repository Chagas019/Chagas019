# Lectio Divina Diária

Site da Lectio Divina Diária: o Evangelho e a homilia de cada dia, e um guia para a pessoa fazer a sua própria Lectio. Feito com React, Vite, Tailwind CSS e lucide-react. No ar em https://lectio-divina-three.vercel.app.

- **Abertura** em tela cheia, com a pintura “Cristo no Getsêmani” (Hofmann, 1886, domínio público) em movimento lento. Mostra a data de hoje, a referência do Evangelho do dia e quantos dias seguidos a pessoa já rezou.
- **O Evangelho de hoje** aparece sozinho todo dia, com as outras leituras e o salmo logo abaixo.
- **A homilia de hoje**, escrita automaticamente a partir das leituras do dia (`gerarHomilia` em `src/lib/homily.ts`). Ela usa a frase mais forte do Evangelho como título, comenta o evangelista e o tempo litúrgico, liga com a 1ª leitura e o refrão do salmo, traz para a vida e termina na Eucaristia. As frases entre aspas são copiadas do próprio Evangelho e do salmo. A redação varia conforme a data e é sempre a mesma para o mesmo dia. Dá para copiar ou ouvir em voz alta, e ninguém precisa escrever nada.
- **Palavra do dia**: faixa com a frase de Jesus mais forte do Evangelho.
- **Faça a sua Lectio**: guia passo a passo (preparação, lectio, meditatio, oratio, contemplatio, actio) com tempo sugerido e timer com sino. O site só orienta; a pessoa reza por conta própria. Ao concluir, o dia é marcado no calendário.
- **Calendário** do mês: hoje fica destacado e os dias em que a pessoa fez a sua Lectio ganham uma marca. Tocar num dia abre o Evangelho e a homilia daquela data.
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
