// Reads and updates my-data/applications.md, the log of every posting seen.
// Status words come from its "Statuses:"/"Estados:" line, so the file keeps its language.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { paths } from './paths.mjs';

const STATUS_COL = 5; // Date | Company | Role | Link | Affinity | Status | Notes

export function readLog() {
  if (!existsSync(paths.log)) return null;
  const text = readFileSync(paths.log, 'utf8');
  const statuses = (text.match(/^(?:Estados|Statuses):\s*(.+)$/m)?.[1] ?? '').split('·').map(s => s.replace(/`/g, '').trim());
  const rows = text.split(/\r?\n/).filter(l => l.startsWith('|') && !/^\|\s*-/.test(l)).slice(1)
    .map(raw => {
      const cells = raw.split('|').slice(1, -1).map(c => c.trim());
      return { raw, date: cells[0], company: cells[1], role: cells[2], link: cells[3], status: cells[STATUS_COL] };
    });
  // The log's own word for a status role, whichever language it is written in.
  const word = (re, fallback) => statuses.find(s => re.test(s)) ?? fallback;
  return { text, rows, word };
}

// Ids of every logged posting (ATS ids, numeric ids, Recruitee slugs), for deduplication.
export function knownIds() {
  const log = readLog();
  if (!log) return new Set();
  const ids = log.text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\b\d{7,}\b|\b[0-9A-F]{10}\b|\b[0-9a-f]{12}\b/gi) ?? [];
  const slugs = [...log.text.matchAll(/\/o\/([\w-]+)/g)].map(m => m[1]);
  return new Set([...ids, ...ids.map(s => s.toLowerCase()), ...slugs]);
}

// changes: Map of row.raw -> new status word.
export function setStatuses(log, changes) {
  let out = log.text;
  for (const [raw, status] of changes) {
    const cells = raw.split('|');
    cells[STATUS_COL + 1] = ` ${status} `;
    out = out.replace(raw, cells.join('|'));
  }
  writeFileSync(paths.log, out);
}
