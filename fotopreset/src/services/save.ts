import { Capacitor } from '@capacitor/core';

export type SaveResult = 'downloaded' | 'shared' | 'cancelled';

export const isNativeApp = (): boolean => Capacitor.isNativePlatform();

/** O compartilhamento nativo permite "Salvar imagem" na galeria do celular. */
export function canShareFile(file: File): boolean {
  return typeof navigator !== 'undefined' && !!navigator.canShare?.({ files: [file] });
}

export async function shareFile(file: File): Promise<SaveResult> {
  try {
    await navigator.share({ files: [file], title: 'Chagas Color' });
    return 'shared';
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    throw new Error('Não foi possível compartilhar a foto.');
  }
}

export function downloadFile(file: File): SaveResult {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Dá tempo ao navegador de iniciar o download antes de liberar a memória.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return 'downloaded';
}
