// Provedores de IA. O motor conversa com uma interface mínima:
//   provider.complete({ model, effort, system, messages, tools, webSearch, maxTokens }) -> { content, stop_reason, usage }
import Anthropic from '@anthropic-ai/sdk';

export function anthropicProvider(env = process.env) {
  if (!env.ANTHROPIC_API_KEY && !env.ANTHROPIC_AUTH_TOKEN) return null;
  const client = new Anthropic({ maxRetries: 2, timeout: 10 * 60 * 1000 });
  return {
    name: 'anthropic',
    async complete({ model, effort, system, messages, tools = [], webSearch = false, maxTokens = 16000 }) {
      const allTools = [...tools];
      if (webSearch) allTools.push({ type: 'web_search_20260209', name: 'web_search', max_uses: 5 });
      const params = {
        model, max_tokens: maxTokens, system, messages,
        output_config: { effort },
        ...(allTools.length ? { tools: allTools } : {}),
      };
      // Fallback no servidor quando um classificador de segurança recusa (Opus/Sonnet na API da Claude)
      if (!model.startsWith('claude-haiku')) {
        return client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
      }
      return client.messages.create(params);
    },
  };
}

// Provedor programável para testes (nenhuma chamada de rede)
export function scriptedProvider(script) {
  const calls = [];
  return {
    name: 'scripted',
    calls,
    async complete(req) {
      calls.push(JSON.parse(JSON.stringify(req)));
      const r = await script(req, calls.length - 1);
      if (r instanceof Error) throw r;
      return { usage: { input_tokens: 1000, output_tokens: 500 }, ...r };
    },
  };
}

// Helpers para montar respostas falsas nos testes
export const toolUse = (name, input, id = `tu_${name}_${Math.random().toString(36).slice(2, 8)}`) => ({ type: 'tool_use', id, name, input });
export const text = (t) => ({ type: 'text', text: t });
