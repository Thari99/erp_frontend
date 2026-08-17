function escapeCsvCell(value: string) {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(rows: string[][]) {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

export function downloadCsv(filename: string, csv: string) {
  // Leading BOM so Excel (still the most common opener) detects UTF-8 instead of
  // mis-decoding non-ASCII names/remarks.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
