export function toCSV(rows: (string | number)[][]) {
  return rows
    .map((r) =>
      r
        .map((c) => {
          const s = String(c ?? '');
          // Evita injeção de fórmulas ao abrir no Excel/Sheets.
          const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
          return /[",;\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
        })
        .join(';'),
    )
    .join('\n');
}

/** Baixa um arquivo gerado no navegador. O link fica no documento e o endereço só é
 * liberado depois de um tempo: celulares lentos e o Safari do iPhone precisam disso. */
export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 60_000);
}

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  downloadBlob(filename, new Blob(['﻿' + toCSV(rows)], { type: 'text/csv;charset=utf-8' }));
}
