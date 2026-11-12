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

/**
 * A deck that also has <name>-annotated.pdf in public/slides/: the PDF that Carlos wrote on in
 * class, as exported from his iPad (the handout or the slides, with any page he added).
 */
type AnnotatedOf<F> = F extends `slides/${infer N}-annotated.pdf` ? N : never;
export type AnnotatedDeckName = DeckName & AnnotatedOf<PublicFile>;

/**
 * The two buttons of a deck: Slides (a page per click, as projected) and Handout (a page per
 * frame). Each opens its PDF at the first page, since a row shows a whole deck.
 */
export function deckLinks(name: DeckName): Link[] {
  return [
    { label: 'Slides', url: file(`slides/${name}-slides.pdf`) },
    { label: 'Handout', url: file(`slides/${name}-handout.pdf`) },
  ];
}

/** The button Annotated of a deck that Carlos wrote on in class: <name>-annotated.pdf. */
export function annotatedLink(name: AnnotatedDeckName): Link {
  return { label: 'Annotated', url: file(`slides/${name}-annotated.pdf`) };
}

/** A notebook of public/notebooks/, opened in Google Colab from this public repository. */
export const colab = (path: Extract<PublicFile, `notebooks/${string}.ipynb`>): string =>
  `https://colab.research.google.com/github/${REPO}/blob/main/public/${path}`;
