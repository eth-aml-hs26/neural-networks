// Writes src/data/public-files.ts, the type PublicFile: every file of public/ that a link
// may point at (a PDF, a notebook, a zip, the index.html of a page). The link helpers of
// src/data/links.ts take a PublicFile, so `tsc -b` rejects a link to a file that public/
// does not hold. `npm run dev` and `npm run build` run this script first; the file it
// writes is not committed.
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const pub = join(root, 'public');
const LINKABLE = /\.(pdf|ipynb|zip)$|(^|\/)index\.html$/;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (name.startsWith('.')) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = walk(pub)
  .map((path) => relative(pub, path).split(sep).join('/'))
  .filter((path) => LINKABLE.test(path))
  .sort();

const union = files.length ? files.map((f) => `  | ${JSON.stringify(f)}`).join('\n') : '  never';
writeFileSync(
  join(root, 'src/data/public-files.ts'),
  '// Written by scripts/list-public-files.mjs from the files in public/. Do not edit.\n' +
    `export type PublicFile =\n${union};\n`,
);
console.log(`src/data/public-files.ts: ${files.length} files a link may point at`);
