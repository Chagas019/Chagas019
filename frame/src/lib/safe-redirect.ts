/** Aceita apenas caminhos internos (evita open redirect). */
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  // Navegadores ignoram tabs/quebras de linha e tratam "\" como "/" — rejeitamos ambos antes de resolver.
  if (!next || !next.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  try {
    const base = "http://frame.invalid";
    const url = new URL(next, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
