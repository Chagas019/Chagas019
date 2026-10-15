import { describe, expect, it } from 'vitest';
import { exportFileName, formatBytes, validateFile } from './files';

describe('validateFile', () => {
  it('aceita fotos comuns', () => {
    expect(validateFile({ name: 'a.jpg', type: 'image/jpeg', size: 1000 })).toBeNull();
    expect(validateFile({ name: 'a.HEIC', type: '', size: 1000 })).toBeNull();
  });

  it('recusa arquivos inválidos', () => {
    expect(validateFile({ name: 'a.pdf', type: 'application/pdf', size: 1000 })).toMatch(/Formato/);
    expect(validateFile({ name: 'a.jpg', type: 'image/jpeg', size: 0 })).toMatch(/vazio/);
    expect(validateFile({ name: 'a.jpg', type: 'image/jpeg', size: 200 * 1024 * 1024 })).toMatch(/grande/);
    expect(validateFile({ name: 'a.svg', type: 'image/svg+xml', size: 10 })).toMatch(/Formato/);
  });
});

describe('exportFileName', () => {
  it('gera nome seguro com a marca', () => {
    expect(exportFileName('Viagem Emaús.HEIC', 'jpeg')).toBe('viagem-emaus-chagas-color.jpg');
    expect(exportFileName('...', 'png')).toBe('foto-chagas-color.png');
  });
});

describe('formatBytes', () => {
  it('formata em KB e MB', () => {
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3,5 MB');
  });
});
