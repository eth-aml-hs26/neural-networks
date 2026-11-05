import type { Kind, Material, Step } from '../types';
import { anchors, type AnchorKey } from './anchors';
import { annotatedLink, deckLinks, type AnnotatedDeckName, type DeckName, type DeckPages } from './links';
import { materials, type MaterialId } from './materials';

/**
 * A row that shows a whole material of the catalogue. `topic` is the bold line: what the row
 * covers, in a few dry words. `title` replaces the material's own title on the linked line,
 * e.g. 'Language models, parts 1 and 2' for a row that covers only part of a deck.
 */
export function step(id: MaterialId, topic: string, title?: string): Step {
  const m: Material = materials[id];
  return { kind: m.kind, topic, title: title ?? m.title, links: m.links };
}

/**
 * A row that opens a deck at one of its parts: both buttons open its PDF at the pages of the
 * anchor `<deck>#<part>` of anchors.ts. An anchor with an `annotated` page adds the button
 * Annotated, which opens the PDF that Carlos wrote on in class at that page.
 */
export function part(at: AnchorKey, topic: string, title: string): Step {
  const deck = at.slice(0, at.indexOf('#')) as DeckName;
  const pages: DeckPages = anchors[at];
  const links = deckLinks(deck, pages);
  // npm run anchors fails when the deck of an `annotated` page has no annotated PDF.
  if (pages.annotated) links.push(annotatedLink(deck as AnnotatedDeckName, pages.annotated));
  return { kind: 'slides', topic, title, links };
}

/** A placeholder for material still to be made: shown greyed out in the group of its kind. */
export function soon(kind: Kind, topic: string, title: string): Step {
  return { kind, soon: true, topic, title, links: [] };
}
