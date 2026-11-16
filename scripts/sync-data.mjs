#!/usr/bin/env node
// Keeps my-data/ in sync with its private GitHub repo, when it is one (see README, "Run the alert in the cloud").
// Does nothing when my-data/ is not a git repository, and never fails loudly: it runs from Claude Code hooks.
//
//   node scripts/sync-data.mjs pull   Bring in what the cloud scan (or another device) committed.
//   node scripts/sync-data.mjs push   Commit and upload local changes, if any.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { hostname } from 'node:os';
import { paths } from './lib/paths.mjs';

const cmd = process.argv[2];
if (!existsSync(join(paths.data, '.git'))) process.exit(0);

const git = (...a) => spawnSync('git', ['-C', paths.data, ...a], { encoding: 'utf8' });
const report = (msg, r) => { if (r.status !== 0) console.error(`sync-data: ${msg} failed: ${(r.stderr || r.stdout).trim()}`); };

if (cmd === 'pull') {
  report('pull', git('pull', '--rebase', '--autostash', '--quiet'));
} else if (cmd === 'push') {
  if (!git('status', '--porcelain').stdout.trim()) process.exit(0);
  git('add', '-A');
  report('commit', git('commit', '--quiet', '-m', `Update from ${hostname()} ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`));
  // Rebase on top of anything the cloud scan committed meanwhile, then upload.
  report('pull', git('pull', '--rebase', '--quiet'));
  report('push', git('push', '--quiet'));
} else {
  console.error('Usage: node scripts/sync-data.mjs pull | push');
  process.exit(2);
}
