# Limitações oficiais e alternativas seguras

O SOCIAL AI usa apenas APIs e dados oficiais. Onde a plataforma não oferece um recurso, o sistema **não** contorna as regras — aplica uma alternativa segura.

| Recurso desejado | Situação na API oficial | Alternativa implementada |
|---|---|---|
| Ver Reels/carrosséis em alta de outros perfis | Sem endpoint de "trending". **Hashtag Search** (top/recent media) exige o recurso *Instagram Public Content Access* e permite 30 hashtags únicas por 7 dias. **Business Discovery** retorna métricas públicas de contas Business/Creator. | Trend Scout usa Hashtag Search (com controle do limite de 30/7 dias), Business Discovery das contas de referência configuradas, a própria mídia do perfil e **pesquisa web pública** via ferramenta oficial do Claude. Nada de scraping. |
| Salvamentos/compartilhamentos de posts de terceiros | Não são públicos. Só curtidas e comentários. | O relatório marca explicitamente o que é medido e o que é inferido. O Analyst usa salvamentos/compartilhamentos **do próprio perfil**. |
| Copiar referências | Proibido por direitos autorais e pelas instruções do sistema. | Só padrões abstratos (gancho, estrutura, duração, estilo, CTA) são armazenados; a primeira linha de legendas alheias é usada apenas na análise e não é salva. |
| Stickers interativos em Stories (enquete, pergunta, link) | Não suportados pela Content Publishing API. | A interação é escrita **na arte** (ex.: "Responda nos comentários do Reel"); a enquete pode ser adicionada manualmente pelo app se desejado. |
| Músicas/áudios em alta da biblioteca do Instagram | Não acessíveis pela API. | Reels saem com trilha licenciada colocada em `storage/music/` (mixada a −16 dB com fade) ou áudio silencioso; recomenda-se trocar o áudio pelo app quando quiser usar trending audio. |
| Stories via API | Disponível apenas para contas Business (não Creator, dependendo da versão/elegibilidade). | O Publisher tenta; se a API recusar, a publicação fica bloqueada/falha com o motivo e não afeta o resto da agenda. |
| `impressions` | Descontinuada para mídias novas (2025). | Usa `views`, `reach`, `total_interactions` e métricas específicas por formato. Métricas não suportadas são consultadas uma a uma e ignoradas sem quebrar a coleta. |
| Agendamento nativo do Instagram | A API não agenda; publica imediatamente. | Agendamento próprio (fila + scheduler) com janela de publicação. |
| Limite de publicação | 100 posts via API por 24 h (consultável em `content_publishing_limit`). | Consultado antes de cada publicação; se esgotado, a tarefa é reagendada. |
| Mídia por upload direto | A API exige URL pública. | Servidor expõe `/media/public/<nome aleatório>`; exige `PUBLIC_BASE_URL` HTTPS. |
| Curtir, comentar, seguir, DMs em massa | Violam as políticas. | **Não implementado** por design. |
| Remotion | Licença comercial para empresas e alto custo de render. | Vídeos programáticos com templates SVG + FFmpeg (zoom suave, transições, H.264/AAC). A interface `renderReel()` permite trocar por Remotion se a licença for adequada. |
