# PAFIEIS — série de vídeos do mascote oficial da PAFIES

Vídeos verticais (1080×1920, 30 fps, MP4) feitos com [Remotion](https://www.remotion.dev/).
O personagem é a **imagem original** (`public/ref/pafieis-original.jpg`), sem redesenho.
Ele é animado em camadas: cabeça recortada (com gorro e fones), piscadas, boca
sincronizada com a voz, respiração, balanço e movimentos de câmera.

## Estrutura

```
public/ref/            imagem original do personagem
public/puppet/         camadas geradas (placa com fundo reconstruído + cabeça)
public/audio/          voz, trilha e efeitos sonoros
public/fonts/          fontes locais (Montserrat, Great Vibes)
src/character/         PhotoPuppet (personagem animado) e rig (poses, piscadas, fala)
src/components/        grafismos: fundo, título 3D, cards, cartão final, logo PAfies
src/episodes/          um arquivo por episódio (roteiro + tempos + direção)
tools/puppet.py        recorta a cabeça e reconstrói o fundo a partir da imagem original
tools/lipsync.py       gera os dados de sincronização labial a partir do áudio da voz
tools/audio.py         sintetiza a trilha e os efeitos (originais, sem direitos de terceiros)
tools/stills.mjs       renderiza quadros avulsos para revisão
```

## Como gerar o vídeo

```bash
npm install
python3 tools/puppet.py                       # só se trocar a imagem do personagem
python3 tools/audio.py 26 1.6                 # trilha (duração, início do drop)
python3 tools/lipsync.py public/audio/voz-apresentacao.mp3 src/episodes/apresentacao.lipsync.json
npx remotion render Apresentacao out/pafieis-apresentacao.mp4
```

Ambiente sem download de navegador: defina `REMOTION_BROWSER` ou use `--browser-executable`.

## Novo episódio (Pafieis News, Pafieis Explica, Pafieis Responde…)

1. Gere a voz do roteiro e salve em `public/audio/voz-<episodio>.mp3`.
2. Copie `src/episodes/apresentacao.tsx` para `src/episodes/<episodio>.tsx`.
3. Troque `ROTEIRO`, `VOICE` e os tópicos/textos.
4. Rode `tools/lipsync.py` e ajuste `CUES` com os trechos de fala que ele imprime.
5. Registre a composição em `src/Root.tsx` e renderize.

Frases da identidade: "PAFIEIS NA ÁREA!" (abertura) · "E aí, pessoal!" · "Fiquem ligados!" ·
"Bora participar?" · "Eu sou o Pafieis, e a gente se encontra na próxima!" (encerramento).
