import { env } from '../../config/env.js';

/**
 * Geração de imagens originais (opcional). Quando não configurada, o Creative Studio
 * usa apenas a composição tipográfica da marca — nunca imagens aleatórias ou de banco sem relação.
 */
export interface ImageGenProvider {
  readonly name: string;
  generate(prompt: string, size: '1024x1536' | '1024x1024'): Promise<Buffer>;
}

class OpenAIImages implements ImageGenProvider {
  readonly name = 'openai';
  constructor(private apiKey: string, private model: string) {}
  async generate(prompt: string, size: '1024x1536' | '1024x1024') {
    const res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, prompt, size, n: 1 }),
    });
    const j: any = await res.json();
    if (!res.ok) throw new Error(`Geração de imagem falhou: ${j?.error?.message ?? res.status}`);
    const b64 = j.data?.[0]?.b64_json;
    if (b64) return Buffer.from(b64, 'base64');
    const url = j.data?.[0]?.url;
    if (!url) throw new Error('Resposta de geração de imagem sem conteúdo');
    return Buffer.from(await (await fetch(url)).arrayBuffer());
  }
}

let override: ImageGenProvider | null | undefined;
export function setImageGen(p: ImageGenProvider | null | undefined) {
  override = p;
}

export function getImageGen(): ImageGenProvider | null {
  if (override !== undefined) return override;
  const e = env();
  if (e.IMAGE_GEN_PROVIDER === 'openai' && e.IMAGE_GEN_API_KEY) return new OpenAIImages(e.IMAGE_GEN_API_KEY, e.IMAGE_GEN_MODEL);
  return null;
}
