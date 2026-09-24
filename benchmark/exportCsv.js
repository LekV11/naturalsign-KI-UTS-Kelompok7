/**
 * NaturalSign - Module Benchmark & Export CSV
 * Anggota Penanggung Jawab: Modul 4 (Testing & Benchmark Lead)
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * Format array of objects to CSV string
 * @param {Array<object>} rows
 * @returns {string}
 */
export function formatToCsv(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];

  for (const row of rows) {
    const values = headers.map(header => {
      const val = row[header];
      if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val ?? '';
    });
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

/**
 * Simpan array data ke file CSV
 * @param {string} filePath
 * @param {Array<object>} rows
 */
export function saveCsvFile(filePath, rows) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const csvContent = formatToCsv(rows);
  fs.writeFileSync(filePath, csvContent, 'utf8');
}
