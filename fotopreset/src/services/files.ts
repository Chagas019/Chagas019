import type { ExportFormat } from '../engine/core';

export const MAX_FILE_BYTES = 80 * 1024 * 1024;

const ACCEPTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
  'image/heif',
  'image/bmp',
  'image/gif',
]);
const ACCEPTED_EXT = /\.(jpe?g|png|webp|avif|heic|heif|bmp|gif)$/i;

export const ACCEPT_ATTR = 'image/*';

/** Validação rápida antes de decodificar. Retorna mensagem de erro ou null. */
export function validateFile(file: { name: string; type: string; size: number }): string | null {
  if (file.size === 0) return 'O arquivo está vazio.';
  if (file.size > MAX_FILE_BYTES) return 'Arquivo grande demais (máximo de 80 MB).';
  const typeOk = file.type ? ACCEPTED_TYPES.has(file.type.toLowerCase()) : ACCEPTED_EXT.test(file.name);
  if (!typeOk) return 'Formato não suportado. Use uma foto JPG, PNG ou WEBP.';
  return null;
}

/** "Viagem Emaús.HEIC" → "viagem-emaus-chagas-color.jpg" */
export function exportFileName(original: string, format: ExportFormat): string {
  const base =
    original
      .replace(/\.[^.]+$/, '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'foto';
  return `${base}-chagas-color.${format === 'jpeg' ? 'jpg' : 'png'}`;
}

export function formatBytes(n: number): string {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

export function formatMegapixels(w: number, h: number): string {
  return `${((w * h) / 1e6).toFixed(1).replace('.', ',')} MP`;
}
