// One material, one row. Carlos asked for it on 12 November 2026: "Just for one slide deck,
// there is only one link. Make it one-to-one, not many sections in the website to one slide
// deck." `npm run build` runs this check before the type check. It fails when a material of
// src/data/materials.ts has two rows in src/data/sequence.ts, or when two entries of
// src/data/materials.ts link one file of public/.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (path) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8');

// The files of public/ that each helper of src/data/links.ts points at.
const FILES = {
  file: (path) => [path],
  colab: (path) => [path],
  deckLinks: (name) => [`slides/${name}-slides.pdf`, `slides/${name}-handout.pdf`],
  annotatedLink: (name) => [`slides/${name}-annotated.pdf`],
};

const errors = [];

const rows = new Map();
for (const [, id] of read('src/data/sequence.ts').matchAll(/\bstep\(\s*'([^']+)'/g)) {
  rows.set(id, (rows.get(id) ?? 0) + 1);
}
for (const [id, n] of rows) {
  if (n > 1) errors.push(`${id} has ${n} rows in src/data/sequence.ts`);
}

const catalogue = read('src/data/materials.ts');
const entries = [...catalogue.matchAll(/^ {2}'([^']+)': \{$/gm)];
const owner = new Map();
entries.forEach((entry, i) => {
  const body = catalogue.slice(entry.index, entries[i + 1]?.index ?? catalogue.length);
  const files = new Set();
  for (const [, helper, arg] of body.matchAll(/\b(file|colab|deckLinks|annotatedLink)\(\s*['`]([^'`]+)['`]\s*\)/g)) {
    for (const f of FILES[helper](arg)) files.add(f);
  }
  for (const f of files) {
    if (owner.has(f)) errors.push(`${f} is linked by ${owner.get(f)} and by ${entry[1]} in src/data/materials.ts`);
    else owner.set(f, entry[1]);
  }
});

if (rows.size === 0 || entries.length === 0) {
  errors.push('found no rows or no catalogue entries: has the format of sequence.ts or materials.ts changed?');
}
if (errors.length) {
  console.error(`one material, one row:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log(`one material, one row: ${rows.size} rows of ${entries.length} materials, ${owner.size} files each linked once`);
