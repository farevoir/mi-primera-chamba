// Every file location the scripts use, in one place.
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
// DATA_DIR points elsewhere when the data lives in its own checkout (the GitHub Actions scan).
const data = process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : join(root, 'my-data');

export const paths = {
  data,
  log: join(data, 'applications.md'),
  newPostings: join(data, 'new-postings.md'),
  state: join(data, '.state', 'scan-state.json'),
  // The user's targets, or the template's so the scripts also run before setup.
  targets: [join(data, 'profile', 'targets.json'), join(root, 'templates', 'targets.json')].find(existsSync),
};
