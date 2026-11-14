#!/usr/bin/env node
// Renders an HTML CV to a text-based (ATS-friendly) PDF with a locally installed
// Chromium browser (Chrome, Edge, Chromium or Brave). No npm dependencies.
//
// Usage: node scripts/html-to-pdf.mjs <cv.html> [output.pdf]
// Default output: <Name>_CV_<Company>.pdf next to the HTML, where <Name> comes from
// the HTML <title> ("Jane Doe - Resume") and <Company> from a my-data/jobs/<company>-<role>/ folder.
// Set CHROME_PATH to use a specific browser binary.

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, mkdtempSync, unlinkSync } from 'node:fs';
import { tmpdir, platform } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const [, , htmlArg, outArg] = process.argv;
if (!htmlArg) fail('Usage: node scripts/html-to-pdf.mjs <cv.html> [output.pdf]', 2);

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
