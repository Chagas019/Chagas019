import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadEnv, resetEnvCache } from '../src/config/env.js';
import { createTestDb } from '../src/db/db.js';
import { setLLMProvider, type LLMProvider } from '../src/integrations/llm/provider.js';
import { setImageGen } from '../src/integrations/imagegen/provider.js';
import { setGraphFetch } from '../src/integrations/instagram/account.js';

export function setupTestEnv(overrides: Record<string, string> = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'social-ai-test-'));
  for (const [k, v] of Object.entries({ NODE_ENV: 'test', STORAGE_DIR: dir, BACKUP_DIR: path.join(dir, 'backups'), DATABASE_PATH: ':memory:', ...overrides })) process.env[k] = v;
  resetEnvCache();
  loadEnv();
  const db = createTestDb();
  setImageGen(null);
  setGraphFetch(undefined);
  return { dir, db };
}

/** LLM falso para testes: devolve respostas fictícias em ordem e registra os prompts. */
export class FakeLLM implements LLMProvider {
  readonly name = 'fake';
  calls: { system: string; prompt: string; webSearch: boolean }[] = [];
  constructor(private responders: ((prompt: string) => unknown)[]) {}
  async json(req: any) {
    this.calls.push({ system: req.system, prompt: req.prompt, webSearch: !!req.webSearch });
    const r = this.responders.shift();
    if (!r) throw new Error('FakeLLM sem respostas restantes');
    return { data: req.schema.parse(r(req.prompt)), usage: { input: 10, output: 20 }, sources: [] };
  }
}

export function useLLM(responders: ((prompt: string) => unknown)[]) {
  const f = new FakeLLM(responders);
  setLLMProvider(f);
  return f;
}

/** Roteador HTTP falso da Graph API (somente para testes). */
export function fakeGraph(routes: Record<string, (url: URL, body: URLSearchParams) => unknown>) {
  const calls: { method: string; path: string; body: URLSearchParams; url: URL }[] = [];
  const f = async (u: string, init?: RequestInit) => {
    const url = new URL(u);
    const method = init?.method ?? 'GET';
    const body = new URLSearchParams((init?.body as string) ?? '');
    const p = url.pathname.replace(/^\/v[\d.]+\//, '');
    calls.push({ method, path: p, body, url });
    const key = Object.keys(routes).find((k) => {
      const [m, pat] = k.split(' ');
      return m === method && new RegExp(`^${pat}$`).test(p);
    });
    if (!key) return new Response(JSON.stringify({ error: { message: `rota falsa ausente: ${method} ${p}`, code: 100 } }), { status: 400 });
    try {
      return new Response(JSON.stringify(routes[key](url, body)), { status: 200 });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.graph ?? { message: e.message, code: 2 } }), { status: e.status ?? 500 });
    }
  };
  setGraphFetch(f);
  return calls;
}

export const sampleCopy = (format: string) => ({
  title: '[FICTÍCIO] 3 ajustes de luz no celular',
  hook: 'Sua foto escura não é culpa do celular.',
  caption_body: 'Toque na tela para fixar o foco, baixe a exposição até as altas luzes voltarem e use a janela como luz principal.',
  cta: 'Salve para testar no próximo clique.',
  hashtags: ['fotografiamobile', 'dicasdefoto', 'fotocomcelular', 'iluminacao', 'edicaodefotos'],
  cover_title: 'Luz boa sem equipamento',
  kicker: 'Fotografia',
  reel_script: format === 'REELS' ? { duration_seconds: 12, scenes: [
    { start: 0, end: 3, on_screen_text: 'Foto escura? Não é o celular', emphasis: null, voiceover: '...', visual_direction: 'close' },
    { start: 3, end: 6, on_screen_text: 'Fixe o foco e a exposição', emphasis: 'segure o dedo na tela', voiceover: '...', visual_direction: 'tela' },
    { start: 6, end: 9, on_screen_text: 'Use a janela como luz', emphasis: null, voiceover: '...', visual_direction: 'janela' },
    { start: 9, end: 12, on_screen_text: 'Salve e teste hoje', emphasis: null, voiceover: '...', visual_direction: 'cta' },
  ] } : null,
  carousel_slides: format === 'CAROUSEL' ? [
    { title: 'Luz boa sem equipamento', body: '' },
    { title: 'Fixe o foco', body: 'Segure o dedo no assunto até aparecer o bloqueio AE/AF.' },
    { title: 'Baixe a exposição', body: 'Arraste o sol para baixo até recuperar as altas luzes.' },
    { title: 'Salve este guia', body: 'Teste os três passos hoje e compare.' },
  ] : null,
  image: format === 'IMAGE' ? { headline: 'A janela é o seu melhor refletor', subheadline: 'Posicione o assunto a 45 graus da luz natural.' } : null,
  stories: format === 'STORIES' ? [
    { text: 'Você fotografa mais de dia ou de noite?', kicker: 'Enquete', interaction_prompt: 'Responda nos comentários do Reel' },
    { text: 'Hoje no Reel: luz boa sem equipamento', kicker: null, interaction_prompt: null },
    { text: 'Qual app você usa para editar?', kicker: 'Pergunta', interaction_prompt: 'Manda no direct' },
  ] : null,
  visual_prompt: 'janela com luz natural sobre uma mesa',
});
