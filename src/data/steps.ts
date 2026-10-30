import type { Material, Step } from '../types';
import { materials, type MaterialId } from './materials';

/**
 * A step that shows one material of the catalogue. `note` says what to do with it at this
 * point, e.g. 'Frames 1 to 8.'; `title` replaces the material's title when the step shows
 * only a part of it, e.g. 'Attention, the rest of the deck'.
 */
export function step(id: MaterialId, extra: { note?: string; title?: string } = {}): Step {
  const m: Material = materials[id];
  return { kind: m.kind, title: extra.title ?? m.title, summary: m.summary, links: m.links, note: extra.note };
}

/** A placeholder for material still to be made: shown greyed out, with no link. */
export function soon(title: string, summary: string): Step {
  return { kind: 'soon', title, summary, links: [] };
}
