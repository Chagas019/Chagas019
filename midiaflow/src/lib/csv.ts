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

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const blob = new Blob(['﻿' + toCSV(rows)], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
