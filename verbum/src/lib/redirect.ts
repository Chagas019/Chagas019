/** Aceita apenas caminhos internos (bloqueia "//host", "/\host", controles e esquemas). */
export function safeRedirectPath(value: string | null | undefined, fallback = "/painel"): string {
  if (!value || !/^\/(?![\/\\])[^\s\\]*$/.test(value)) return fallback;
  try {
    const base = "https://verbum.invalid";
    const url = new URL(value, base);
    return url.origin === base ? url.pathname + url.search + url.hash : fallback;
  } catch {
    return fallback;
  }
}
