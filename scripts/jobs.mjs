#!/usr/bin/env node
// Job postings straight from public ATS APIs, no AI and no npm dependencies:
// the mechanical part of the job search, done by code. Adapters live in lib/ats.mjs.
//
//   node scripts/jobs.mjs scan [--days N] [--all]
//       Checks every board in my-data/profile/targets.json and prints open postings whose title and
//       location match its filters, published in the last N days (default 90). Postings already in
//       my-data/applications.md are hidden unless --all. 🆕 marks postings under 48 hours old.
//   node scripts/jobs.mjs daily
//       For the scheduled run: tidy, then scan, keep postings no earlier daily run has seen, write them
//       to my-data/new-postings.md. Run it on a schedule (GitHub Actions template in templates/github-actions/).
//   node scripts/jobs.mjs tidy
//       Updates the log without asking the user: postings gone from their ATS become "closed",
//       "to verify" rows older than 30 days become "expired".
//   node scripts/jobs.mjs posting <url>
//       Prints one posting in full from its ATS API, or says it is closed.

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { paths } from './lib/paths.mjs';
import { board, details, parseUrl, pool, SUPPORTED } from './lib/ats.mjs';
import { readLog, knownIds, setStatuses } from './lib/log.mjs';
import { day } from './lib/text.mjs';

const [cmd, ...args] = process.argv.slice(2);
const DAY = 864e5;
const commands = { scan, daily, tidy, posting };

if (!commands[cmd] || (cmd === 'posting' && !args[0])) {
  console.error('Usage: node scripts/jobs.mjs scan [--days N] [--all] | daily | tidy | posting <url>');
  process.exit(2);
}
await commands[cmd]();

// ---------- commands ----------

async function scan() {
  const days = Number(args[args.indexOf('--days') + 1]) || 90;
  const showAll = args.includes('--all');
  const { rows, errors, total, logged, boards } = await collect(days, showAll);
  console.log(`Scanned ${boards - errors.length}/${boards} boards, ${total} postings. ` +
    `Matches in last ${days} days: ${rows.length + (showAll ? 0 : logged)} (${logged} already in applications.md${showAll ? '' : ', hidden'}).`);
  rows.forEach(j => console.log(line(j)));
  if (errors.length) console.log(`\nBoards that failed (fix or remove in targets.json):\n${errors.map(e => `- ${e}`).join('\n')}`);
}

async function daily() {
  if (!existsSync(paths.data)) { console.error('my-data/ not found: run the setup-profile skill first.'); process.exit(1); }
  await tidy();
  const state = existsSync(paths.state) ? JSON.parse(readFileSync(paths.state, 'utf8')) : { seen: [] };
  const seenBefore = new Set(state.seen);
  const { rows, errors } = await collect(90, false);
  const key = j => `${j.ats}:${j.id}`;
  const fresh = rows.filter(j => !seenBefore.has(key(j)));
  const now = new Date();

  mkdirSync(dirname(paths.state), { recursive: true });
  writeFileSync(paths.state, JSON.stringify({ ...state, lastRun: now.toISOString(), seen: [...new Set([...state.seen, ...rows.map(key)])] }, null, 2));

  const failed = errors.length ? `\n\nBoards that failed:\n${errors.map(e => `- ${e}`).join('\n')}` : '';
  writeFileSync(paths.newPostings, `# New postings\n\nLast daily scan: ${now.toISOString().slice(0, 16).replace('T', ' ')} UTC. ` +
    `Postings not seen by earlier daily scans and not yet in applications.md. Ask Claude to review them (find-jobs).\n\n` +
    (fresh.length ? fresh.map(line).join('\n') : '_Nothing new since the last scan._') + failed + '\n');

  console.log(`${fresh.length} new posting(s). Written to ${paths.newPostings}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `new=${fresh.length}\n`);
  fresh.forEach(j => console.log(line(j)));
}

async function tidy() {
  const log = readLog();
  if (!log) return;
  const closed = log.word(/^(closed|cerrada)$/i, 'closed');
  const expired = log.word(/^(expired|vencida)$/i, 'expired');
  const toVerify = log.word(/^(to verify|por verificar)$/i, 'to verify');
  const active = new Set([log.word(/^(new|nueva)$/i, 'new'), toVerify, log.word(/^(cv ready|cv listo)$/i, 'cv ready')]);
  const changes = new Map();

  // Closed: an active row whose ATS board no longer lists its posting.
  const byBoard = new Map();
  for (const r of log.rows) {
    const ref = active.has(r.status) && parseUrl(r.link ?? '');
    if (!ref) continue;
    const k = `${ref.ats}/${ref.board}`;
    if (!byBoard.has(k)) byBoard.set(k, { ref, rows: [] });
    byBoard.get(k).rows.push({ r, id: ref.id.toLowerCase() });
  }
  await pool([...byBoard.values()], 6, async ({ ref, rows }) => {
    let open;
    try { open = new Set((await board(ref.ats, ref.board)).map(j => j.id.toLowerCase())); } catch { return; }
    for (const { r, id } of rows) if (!open.has(id)) changes.set(r.raw, closed);
  });

  // Expired: "to verify" rows nobody resolved within 30 days.
  for (const r of log.rows) {
    if (r.status === toVerify && Date.now() - Date.parse(r.date) > 30 * DAY && !changes.has(r.raw)) changes.set(r.raw, expired);
  }

  if (!changes.size) return console.log('Tidy: applications.md is current.');
  setStatuses(log, changes);
  console.log(`Tidy: ${changes.size} row(s) updated in applications.md`);
  for (const r of log.rows) if (changes.has(r.raw)) console.log(`- ${r.company} | ${r.role} → ${changes.get(r.raw)}`);
}

async function posting() {
  const ref = parseUrl(args[0]);
  if (!ref) {
    console.error(`Not a posting URL from a supported ATS (${SUPPORTED.join(', ')}). Read this page another way.`);
    process.exit(1);
  }
  const jobs = await board(ref.ats, ref.board);
  const found = jobs.find(x => x.id.toLowerCase() === ref.id.toLowerCase());
  if (!found) return console.log(`NOT FOUND on the ${ref.ats} board "${ref.board}" (${jobs.length} open postings): the posting is most likely closed.`);
  const j = await details(found);
  console.log([
    `Company: ${j.company}`, `Title: ${j.title}`, `Locations: ${j.locations.join(' / ') || 'not shown'}`,
    `Remote: ${j.remote ?? 'not shown'}`, `Published: ${day(j.published)}`, `Salary: ${j.salary || 'not shown'}`,
    `URL: ${j.url}`, '', j.text.slice(0, 12000),
  ].join('\n'));
}

// ---------- helpers ----------

// Open postings on every target board that match its title, location and date filters.
async function collect(days, showAll) {
  const cfg = JSON.parse(readFileSync(paths.targets, 'utf8'));
  const titleRe = new RegExp(cfg.titleInclude, 'i');
  const excludeRe = cfg.titleExclude ? new RegExp(cfg.titleExclude, 'i') : null;
  const locRe = new RegExp(cfg.locationInclude, 'i');
  // Descriptions mention "global" or "Americas" loosely, so they get a stricter pattern.
  const descRe = new RegExp(cfg.descriptionInclude ?? cfg.locationInclude, 'i');
  const since = Date.now() - days * DAY;
  const known = knownIds();

  const results = await pool(cfg.boards, 6, async b => {
    try { return { b, jobs: await board(b.ats, b.board) }; } catch (e) { return { b, error: e.message }; }
  });

  const rows = [], errors = [];
  let total = 0, logged = 0;
  for (const r of results) {
    if (r.error) { errors.push(`${r.b.ats}/${r.b.board}: ${r.error}`); continue; }
    // Some ATSs (Workable) list one posting once per location: merge them by id.
    const byId = new Map();
    for (const j of r.jobs) {
      const prev = byId.get(j.id);
      if (prev) prev.locations = [...new Set([...prev.locations, ...j.locations])];
      else byId.set(j.id, { ...j });
    }
    total += byId.size;
    for (const j of byId.values()) {
      if (!titleRe.test(j.title) || excludeRe?.test(j.title)) continue;
      if (j.published && j.published < since) continue;
      const where = j.locations.join(' / ');
      const textMatch = !locRe.test(where) && descRe.test(j.text.slice(0, 4000));
      if (!locRe.test(where) && !textMatch) continue;
      const isKnown = known.has(j.id);
      if (isKnown) { logged++; if (!showAll) continue; }
      rows.push({ ...j, where, flag: textMatch ? 'location only in description' : '', known: isKnown });
    }
  }
  rows.sort((a, b) => (b.published ?? 0) - (a.published ?? 0));
  return { rows, errors, total, logged, boards: cfg.boards.length };
}

function line(j) {
  const fresh = j.published && Date.now() - j.published < 2 * DAY;
  return `- ${fresh ? '🆕 ' : ''}${j.company} | ${j.title} | ${j.where || 'location not shown'} | ${day(j.published)} | ${j.url}` +
    `${j.flag ? ` | ${j.flag}` : ''}${j.known ? ' | ALREADY LOGGED' : ''}`;
}

