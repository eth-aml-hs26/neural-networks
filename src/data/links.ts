import type { Link } from '../types';
import type { PublicFile } from './public-files';

/**
 * Placeholder for material that is not on the site yet. It renders greyed out as "soon",
 * so a section can name a step before its file exists.
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

/** A deck with both of its PDFs in public/slides/: <name>-slides.pdf and <name>-handout.pdf. */
type SlidesOf<F> = F extends `slides/${infer N}-slides.pdf` ? N : never;
type HandoutOf<F> = F extends `slides/${infer N}-handout.pdf` ? N : never;
export type DeckName = SlidesOf<PublicFile> & HandoutOf<PublicFile>;

/** The pages at which a step opens a deck, in each of its two PDFs (see data/anchors.ts). */
export interface DeckPages {
  slides: number;
  handout: number;
}

/**
 * The two buttons of a deck: Slides (a page per click, as projected) and Handout (a page per
 * frame). With `at`, each opens at the given page (#page=N, honoured by the PDF viewers of
 * Chrome, Firefox and Safari).
 */
export function deckLinks(name: DeckName, at?: DeckPages): Link[] {
  const slides = file(`slides/${name}-slides.pdf`);
  const handout = file(`slides/${name}-handout.pdf`);
  return [
    { label: 'Slides', url: at ? `${slides}#page=${at.slides}` : slides },
    { label: 'Handout', url: at ? `${handout}#page=${at.handout}` : handout },
  ];
}

/** A notebook of public/notebooks/, opened in Google Colab from this public repository. */
export const colab = (path: Extract<PublicFile, `notebooks/${string}.ipynb`>): string =>
  `https://colab.research.google.com/github/${REPO}/blob/main/public/${path}`;
