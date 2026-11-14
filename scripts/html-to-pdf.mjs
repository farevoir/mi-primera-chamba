#!/usr/bin/env node
// Renders an HTML CV to a text-based (ATS-friendly) PDF with a locally installed
// Chromium browser (Chrome, Edge, Chromium or Brave). No npm dependencies.
//
// Usage: node scripts/html-to-pdf.mjs <cv.html> [output.pdf] [--keywords "term one, term two, ..."]
// Default output: <Name>_CV_<Company>.pdf next to the HTML, where <Name> comes from
// the HTML <title> ("Jane Doe - Resume") and <Company> from a my-data/jobs/<company>-<role>/ folder.
// After rendering it runs CV checks (ATS layout, dates, bullets, contact) and, with --keywords,
// reports which of the posting's terms appear in the CV. Set CHROME_PATH to use a specific browser.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, mkdtempSync, unlinkSync } from 'node:fs';
import { tmpdir, platform } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
const kwIndex = argv.indexOf('--keywords');
const keywords = kwIndex >= 0 ? (argv[kwIndex + 1] ?? '').split(',').map(s => s.trim()).filter(Boolean) : [];
const [htmlArg, outArg] = argv.filter((a, i) => kwIndex < 0 || (i !== kwIndex && i !== kwIndex + 1));
if (!htmlArg) fail('Usage: node scripts/html-to-pdf.mjs <cv.html> [output.pdf] [--keywords "a, b"]', 2);

const htmlPath = resolve(htmlArg);
if (!existsSync(htmlPath)) fail(`HTML file not found: ${htmlPath}`);
const pdfPath = outArg ? resolve(outArg) : join(dirname(htmlPath), defaultName(htmlPath));

const browser = findBrowser();
if (!browser) {
  fail('No Chromium-based browser found. Install Google Chrome, Microsoft Edge or Chromium, ' +
       'or set CHROME_PATH to the browser executable.');
}

if (existsSync(pdfPath)) unlinkSync(pdfPath);
const profile = mkdtempSync(join(tmpdir(), 'cv-pdf-'));
spawnSync(browser, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-pdf-header-footer',
  `--user-data-dir=${profile}`, `--print-to-pdf=${pdfPath}`, pathToFileURL(htmlPath).href,
], { stdio: 'ignore', timeout: 60_000 });

// Some browsers (Edge on Windows) return before the file is fully written.
for (let i = 0; i < 60 && !isComplete(pdfPath); i++) sleep(250);
try { rmSync(profile, { recursive: true, force: true }); } catch { /* browser may still hold it */ }
if (!isComplete(pdfPath)) fail(`The PDF was not generated: ${pdfPath}`);

const pages = countPages(pdfPath);
console.log(`PDF: ${pdfPath}`);
console.log(`Pages: ${pages}`);
if (pages > 1) console.log('Note: more than one page. Trim the least relevant bullets if the profile asks for one page.');

const html = readFileSync(htmlPath, 'utf8');
const issues = checkCv(html);
console.log(issues.length ? `CV checks: ${issues.length} to fix\n${issues.map(i => `- ${i}`).join('\n')}` : 'CV checks: all passed');
if (keywords.length) {
  const text = plain(html).toLowerCase();
  const missing = keywords.filter(k => !text.includes(k.toLowerCase()));
  console.log(`Keywords: ${keywords.length - missing.length}/${keywords.length} present` +
    (missing.length ? `. Missing: ${missing.join(', ')} (add only if backed by the base CV or a confirmed skill)` : ''));
}

// Checks based on recruiter-scan and ATS-parsing guidance; each one is mechanical on purpose.
function checkCv(src) {
  const out = [];
  const body = src.replace(/<!--[\s\S]*?-->/g, '').replace(/<style[\s\S]*?<\/style>/i, '');
  const style = src.match(/<style[\s\S]*?<\/style>/i)?.[0] ?? '';
  const text = plain(body);

  // Layout: elements parsers misread.
  for (const [re, what] of [[/<table/i, 'tables'], [/<img|<svg/i, 'images or icons'], [/<(header|footer)\b/i, 'header/footer elements']]) {
    if (re.test(body)) out.push(`Uses ${what}; ATS parsers may scramble or skip them.`);
  }
  if (/columns\s*:|grid-template-columns/i.test(style)) out.push('Multi-column CSS layout; keep one column.');
  for (const m of style.matchAll(/([.\w#\s-]+)\{[^}]*font-size:\s*([\d.]+)pt/g)) {
    if (Number(m[2]) < 9.5) out.push(`Font size ${m[2]}pt in "${m[1].trim()}"; keep text at 9.5pt or more.`);
  }

  // Standard section names, in the body, so ATS maps them to fields.
  const headings = [...body.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map(m => plain(m[1]).toLowerCase());
  for (const s of ['experience', 'education', 'skills']) {
    if (!headings.some(h => h.includes(s))) out.push(`Missing a standard "${s[0].toUpperCase() + s.slice(1)}" heading.`);
  }

  // Contact details in the body: email, phone with country code.
  if (!/[\w.+-]+@[\w-]+\.[\w.]+/.test(text)) out.push('No email address found.');
  if (!/\+\d[\d\s().-]{7,}/.test(text)) out.push('No phone number with country code (+..) found.');

  // Dates: one consistent "Mon YYYY" style.
  const months = [...text.matchAll(/\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sept?(?:ember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{4}/g)].map(m => m[1]);
  const abbreviated = months.filter(m => m.length === 3 && m !== 'May');
  const full = months.filter(m => m.length > 3);
  if (abbreviated.length && full.length) out.push(`Mixed month formats (${[...new Set(full)].join(', ')} next to ${[...new Set(abbreviated)].join(', ')}); use three-letter months: Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec.`);

  // Bullets: start with an action, stay skimmable.
  const bullets = [...body.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map(m => plain(m[1]));
  for (const b of bullets) {
    const short = b.length > 60 ? b.slice(0, 57) + '...' : b;
    if (/^(responsible for|duties|in charge of|helped|assisted with|worked on|tasked with)/i.test(b)) out.push(`Bullet starts with a weak phrase: "${short}"`);
    if (b.length > 230) out.push(`Bullet longer than ~2 lines (${b.length} chars): "${short}"`);
  }
  for (const m of body.matchAll(/<ul[^>]*>([\s\S]*?)<\/ul>/gi)) {
    const n = (m[1].match(/<li/gi) ?? []).length;
    if (n > 8) out.push(`A role has ${n} bullets; keep 3–8, fewer for older roles.`);
  }

  // Personal data that US/remote employers neither need nor want.
  if (/\b(CURP|RFC|date of birth|birth ?date|marital status|estado civil|nationality|nacionalidad)\b/i.test(text)) out.push('Contains personal data (ID, birth date, marital status or nationality); remove it.');
  return out;
}

function plain(s) {
  return s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}

function defaultName(file) {
  const html = readFileSync(file, 'utf8');
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1] ?? '';
  const person = slug(title.split(/\s+[-–|]\s+/)[0]) || 'CV';
  const folder = basename(dirname(file));
  const inJobs = basename(dirname(dirname(file))) === 'jobs';
  const company = inJobs ? slug(folder.split('-')[0]) : '';
  const cap = company ? company[0].toUpperCase() + company.slice(1) : '';
  return cap ? `${person}_CV_${cap}.pdf` : `${person}_CV.pdf`;
}

function slug(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function findBrowser() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const os = platform();
  if (os === 'win32') {
    const roots = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA].filter(Boolean);
    const rel = [
      'Google\\Chrome\\Application\\chrome.exe',
      'Microsoft\\Edge\\Application\\msedge.exe',
      'Chromium\\Application\\chrome.exe',
      'BraveSoftware\\Brave-Browser\\Application\\brave.exe',
    ];
    for (const r of rel) for (const root of roots) {
      const p = join(root, r);
      if (existsSync(p)) return p;
    }
    return null;
  }
  if (os === 'darwin') {
    return [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    ].find(existsSync) ?? null;
  }
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge', 'brave-browser']) {
    const r = spawnSync('which', [name], { encoding: 'utf8' });
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  }
  return null;
}

function isComplete(file) {
  if (!existsSync(file)) return false;
  try { return readFileSync(file).subarray(-1024).toString('latin1').includes('%%EOF'); } catch { return false; }
}

function countPages(file) {
  const text = readFileSync(file).toString('latin1');
  return (text.match(/\/Type\s*\/Page(?![a-zA-Z])/g) ?? []).length;
}

function sleep(ms) { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }

function fail(message, code = 1) { console.error(message); process.exit(code); }
