#!/usr/bin/env node
// Reads job postings straight from public ATS APIs (Greenhouse, Lever, Ashby, Workable).
// No AI and no npm dependencies: the mechanical part of the job search, done by code.
//
//   node scripts/jobs.mjs scan [--days N] [--all]
//       Scans every board in my-data/targets.json (falls back to example/targets.json) and prints
//       postings whose title and location match the filters there, published in the last N days
//       (default 30). Postings already in my-data/applications.md are hidden unless --all.
//   node scripts/jobs.mjs posting <url>
//       Prints one posting in full (title, locations, date, salary, description) from its ATS API.

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'scan') await scan();
else if (cmd === 'posting' && args[0]) await posting(args[0]);
else {
  console.error('Usage:\n  node scripts/jobs.mjs scan [--days N] [--all]\n  node scripts/jobs.mjs posting <url>');
  process.exit(2);
}

// ---------- commands ----------

async function scan() {
  const days = Number(args[args.indexOf('--days') + 1]) || 30;
  const showAll = args.includes('--all');
  const cfgPath = [join(root, 'my-data', 'targets.json'), join(root, 'example', 'targets.json')].find(existsSync);
  const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
  const titleRe = new RegExp(cfg.titleInclude, 'i');
  const excludeRe = cfg.titleExclude ? new RegExp(cfg.titleExclude, 'i') : null;
  const locRe = new RegExp(cfg.locationInclude, 'i');
  // Descriptions mention "global" or "Americas" loosely, so they get a stricter pattern.
  const descRe = new RegExp(cfg.descriptionInclude ?? cfg.locationInclude, 'i');
  const since = Date.now() - days * 864e5;
  const known = knownIds();

  const results = await pool(cfg.boards, 6, async b => {
    try { return { b, jobs: await board(b.ats, b.board) }; } catch (e) { return { b, error: e.message }; }
  });

  const rows = [], errors = [];
  let total = 0, seen = 0;
  for (const r of results) {
    if (r.error) { errors.push(`${r.b.ats}/${r.b.board}: ${r.error}`); continue; }
    total += r.jobs.length;
    for (const j of r.jobs) {
      if (!titleRe.test(j.title) || excludeRe?.test(j.title)) continue;
      if (j.published && j.published < since) continue;
      const where = j.locations.join(' / ');
      const locMatch = locRe.test(where);
      const textMatch = !locMatch && descRe.test(j.text.slice(0, 4000));
      if (!locMatch && !textMatch) continue;
      if (known.has(j.id)) { seen++; if (!showAll) continue; }
      rows.push({ ...j, where, flag: textMatch ? 'location only in description' : '', known: known.has(j.id) });
    }
  }

  rows.sort((a, b) => (b.published ?? 0) - (a.published ?? 0));
  console.log(`Scanned ${cfg.boards.length - errors.length}/${cfg.boards.length} boards, ${total} postings. ` +
    `Matches in last ${days} days: ${rows.length + (showAll ? 0 : seen)} (${seen} already in applications.md${showAll ? '' : ', hidden'}).`);
  for (const j of rows) {
    console.log(`- ${j.company} | ${j.title} | ${j.where || 'location not shown'} | ${day(j.published)} | ${j.url}` +
      `${j.flag ? ` | ${j.flag}` : ''}${j.known ? ' | ALREADY LOGGED' : ''}`);
  }
  if (errors.length) console.log(`\nBoards that failed (fix or remove in targets.json):\n${errors.map(e => `- ${e}`).join('\n')}`);
}

async function posting(url) {
  const ref = parseUrl(url);
  if (!ref) {
    console.error('Not a Greenhouse, Lever, Ashby or Workable URL. Read this page another way.');
    process.exit(1);
  }
  const jobs = await board(ref.ats, ref.board);
  const j = jobs.find(x => x.id.toLowerCase() === ref.id.toLowerCase());
  if (!j) {
    console.log(`NOT FOUND on the ${ref.ats} board "${ref.board}" (${jobs.length} open postings): the posting is most likely closed.`);
    return;
  }
  console.log([
    `Company: ${j.company}`, `Title: ${j.title}`, `Locations: ${j.locations.join(' / ') || 'not shown'}`,
    `Remote: ${j.remote ?? 'not shown'}`, `Published: ${day(j.published)}`, `Salary: ${j.salary || 'not shown'}`,
    `URL: ${j.url}`, '', j.text.slice(0, 12000),
  ].join('\n'));
}

// ---------- ATS adapters: each returns normalized postings ----------

async function board(ats, name) {
  if (ats === 'greenhouse') {
    const d = await getJson(`https://boards-api.greenhouse.io/v1/boards/${name}/jobs?content=true`);
    return d.jobs.map(j => norm({
      ats, board: name, id: String(j.id), company: j.company_name ?? name, title: j.title,
      locations: [j.location?.name, ...(j.offices ?? []).map(o => o.name)],
      published: Date.parse(j.first_published ?? j.updated_at), url: j.absolute_url, text: html(decode(j.content ?? '')),
    }));
  }
  if (ats === 'lever') {
    const d = await getJson(`https://api.lever.co/v0/postings/${name}?mode=json`);
    return d.map(j => norm({
      ats, board: name, id: j.id, company: name, title: j.text,
      locations: [j.categories?.location, ...(j.categories?.allLocations ?? []), j.country],
      remote: j.workplaceType === 'remote', published: j.createdAt, url: j.hostedUrl,
      salary: j.salaryRange ? `${j.salaryRange.min}–${j.salaryRange.max} ${j.salaryRange.currency}/${j.salaryRange.interval}` : '',
      text: [j.descriptionPlain, ...(j.lists ?? []).map(l => `${l.text}\n${html(l.content)}`), j.additionalPlain].join('\n'),
    }));
  }
  if (ats === 'ashby') {
    const d = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${name}?includeCompensation=true`);
    return d.jobs.map(j => norm({
      ats, board: name, id: j.id, company: name, title: j.title,
      locations: [j.location, ...(j.secondaryLocations ?? []).map(s => s.location), j.address?.postalAddress?.addressCountry],
      remote: j.isRemote, published: Date.parse(j.publishedAt), url: j.jobUrl,
      salary: j.compensation?.compensationTierSummary ?? '', text: j.descriptionPlain ?? '',
    }));
  }
  if (ats === 'workable') {
    const d = await getJson(`https://apply.workable.com/api/v1/widget/accounts/${name}?details=true`);
    return d.jobs.map(j => norm({
      ats, board: name, id: j.shortcode, company: d.name ?? name, title: j.title,
      locations: [...(j.locations ?? []).map(l => [l.city, l.region, l.country].filter(Boolean).join(', ')), j.country],
      remote: j.telecommuting, published: Date.parse(j.published_on ?? j.created_at), url: j.url ?? j.application_url,
      text: html(j.description ?? ''),
    }));
  }
  throw new Error(`unknown ATS "${ats}"`);
}

function norm(j) {
  return { ...j, locations: [...new Set(j.locations.filter(Boolean))], published: Number.isFinite(j.published) ? j.published : null };
}

function parseUrl(url) {
  let m;
  if ((m = url.match(/greenhouse\.io\/(?:embed\/job_app\?for=)?([\w-]+)\/jobs\/(\d+)/))) return { ats: 'greenhouse', board: m[1], id: m[2] };
  if ((m = url.match(/jobs\.lever\.co\/([\w-]+)\/([0-9a-f-]{36})/i))) return { ats: 'lever', board: m[1], id: m[2] };
  if ((m = url.match(/jobs\.ashbyhq\.com\/([\w.-]+)\/([0-9a-f-]{36})/i))) return { ats: 'ashby', board: m[1], id: m[2] };
  if ((m = url.match(/apply\.workable\.com\/([\w-]+)\/j\/([0-9A-F]{10})/i))) return { ats: 'workable', board: m[1], id: m[2] };
  return null;
}

// ---------- helpers ----------

function knownIds() {
  const file = join(root, 'my-data', 'applications.md');
  if (!existsSync(file)) return new Set();
  const text = readFileSync(file, 'utf8');
  const ids = text.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\b\d{7,}\b|\b[0-9A-F]{10}\b/gi) ?? [];
  return new Set(ids.map(s => s.toLowerCase()).concat(ids));
}

async function getJson(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'job-search-script', Accept: 'application/json' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
  }));
  return out;
}

function decode(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

function html(s) {
  return decode(String(s).replace(/<(br|\/p|\/li|\/h\d|\/div)[^>]*>/gi, '\n').replace(/<li[^>]*>/gi, '- ').replace(/<[^>]+>/g, ''))
    .replace(/\n{3,}/g, '\n\n').trim();
}

function day(ms) { return ms ? new Date(ms).toISOString().slice(0, 10) : 'date not shown'; }
