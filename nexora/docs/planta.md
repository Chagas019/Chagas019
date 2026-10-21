# Formato da planta vetorial (`VectorFloorPlan`)

A planta interativa usa dados geométricos, não uma imagem. Envie um `.json` neste formato pelo painel (Imóveis → editar → Planta baixa → "Planta vetorial (.json)").

```json
{
  "kind": "vetorial",
  "source": "Planta do projeto aprovado, prancha 02 (escritório X)",
  "levels": [
    {
      "id": "terreo",
      "name": "Térreo",
      "elevation": 0,
      "height": 3,
      "width": 30,
      "depth": 22,
      "stairs": { "x": 8.6, "y": 5.2, "w": 1.2, "d": 3.8, "dir": "s" },
      "rooms": [
        { "id": "sala", "name": "Sala de estar", "kind": "sala",
          "polygon": [[10, 2], [22, 2], [22, 12], [10, 12]],
          "description": "Texto exibido ao selecionar o ambiente",
          "features": ["Piso de madeira"] },
        { "id": "garagem", "name": "Garagem", "kind": "garagem",
          "polygon": [[0, 2], [6, 2], [6, 8], [0, 8]], "openSides": ["n"] }
      ]
    }
  ]
}
```

## Regras

- **Medidas em metros.** A origem fica no canto superior esquerdo do desenho, com `x` para a direita e `y` para baixo. O lado `n` é o topo do desenho.
- **Polígonos ortogonais.** Use paredes retas, em ângulos de 90°. Formas em L são aceitas.
- **Área.** Se `area` (em m²) não for informada, ela é calculada pelo polígono. Informe `area` quando o valor oficial for diferente.
- **`kind`.** Define cor, mobiliário ilustrativo e paredes. Os valores aceitos são `sala`, `cozinha`, `suite`, `quarto`, `banheiro`, `gourmet`, `piscina`, `jardim`, `garagem`, `circulacao`, `servico`, `escritorio`, `varanda`, `loja`, `deposito` e `lote`.
- **Ambientes abertos.** `piscina`, `jardim`, `gourmet`, `varanda` e `lote` não geram paredes.
- **Paredes e aberturas.** São derivadas automaticamente:
  - entre dois ambientes internos, a parede recebe uma porta;
  - entre sala e cozinha, ou sala e circulação, fica um vão aberto;
  - fachadas de salas, quartos e cozinhas recebem vidro;
  - banheiros e áreas de serviço recebem janelas.
  
  Para mudar uma fachada, use `openSides` (lado totalmente aberto, como o portão da garagem) ou `solidSides` (parede cega).
- **Mobiliário.** É distribuído automaticamente e é só ilustrativo. Para controlar a posição, informe `furniture` no pavimento.
- **Ids dos ambientes.** Use os mesmos ids nos hotspots do modelo 3D, nas fotos (campo "Ambiente") e nos panoramas. É isso que sincroniza planta, 3D e galeria.
