import { describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { decrypt, encrypt, pkceChallenge, safeEqual } from '../src/lib/crypto';

const key = randomBytes(32).toString('base64');

describe('criptografia de tokens', () => {
  it('cifra e decifra (AES-256-GCM) sem expor o texto', () => {
    const enc = encrypt('1//refresh-token-secreto', key);
    expect(enc).toMatch(/^v1:/);
    expect(enc).not.toContain('refresh-token-secreto');
    expect(decrypt(enc, key)).toBe('1//refresh-token-secreto');
  });
  it('IV aleatório: mesmo texto gera cifras diferentes', () => {
    expect(encrypt('a', key)).not.toBe(encrypt('a', key));
  });
  it('detecta adulteração e chave errada', () => {
    const enc = encrypt('token', key);
    const parts = enc.split(':');
    parts[3] = Buffer.from('xxxxx').toString('base64url');
    expect(() => decrypt(parts.join(':'), key)).toThrow();
    expect(() => decrypt(enc, randomBytes(32).toString('base64'))).toThrow();
  });
  it('rejeita chave com tamanho inválido', () => {
    expect(() => encrypt('x', Buffer.from('curta').toString('base64'))).toThrow(/32 bytes/);
  });
  it('PKCE S256 conforme RFC 7636 e comparação em tempo constante', () => {
    expect(pkceChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
  });
});
