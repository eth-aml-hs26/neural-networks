import type { PublicFile } from './public-files';

/**
 * Placeholder for material that is not on the site yet. It renders greyed out as "Soon",
 * so the sequence can name a step before its file exists.
 */
export const SOON = '#';

/** The public repository; Colab reads its notebooks straight from GitHub. */
export const REPO = 'eth-aml-hs26/neural-networks';

/**
 * A file this site serves from public/, by its path there, e.g. 'slides/attention-slides.pdf'
 * or 'viz/wuggish-game/index.html'. PublicFile lists every PDF, notebook and page in public/
 * (scripts/list-public-files.mjs writes it before each build), so `tsc -b` rejects a link to a
 * file that is not there. BASE_URL keeps the link right under the GitHub Pages subpath.
 */
export const file = (path: PublicFile): string => `${import.meta.env.BASE_URL}${path}`;

/** A notebook of public/notebooks/, opened in Google Colab from this public repository. */
export const colab = (path: Extract<PublicFile, `notebooks/${string}.ipynb`>): string =>
  `https://colab.research.google.com/github/${REPO}/blob/main/public/${path}`;
