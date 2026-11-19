import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Testes da versão Floot: dependências da plataforma (@floot/*, kysely) são substituídas por stubs.
export default defineConfig({
  resolve: {
    alias: {
      '@floot/ai': path.resolve(__dirname, 'floot/stubs/floot-ai.ts'),
      '@floot/google-integrations': path.resolve(__dirname, 'floot/stubs/google-integrations.ts'),
      kysely: path.resolve(__dirname, 'floot/stubs/kysely.ts'),
    },
  },
  test: { include: ['floot/tests/**/*.test.ts'], environment: 'node' },
});
