import type { Kind, Material, Step } from '../types';
import { materials, type MaterialId } from './materials';

/**
 * A row that shows a whole material of the catalogue, under its own title and with its own
 * links. `topic` is the bold line: what the row covers, in a few dry words. Every material has
 * exactly one row on the page, a deck included (Carlos, 12 November 2026).
 */
export function step(id: MaterialId, topic: string): Step {
  const m: Material = materials[id];
  return { kind: m.kind, topic, title: m.title, links: m.links };
}

/** A placeholder for material still to be made: shown greyed out in the group of its kind. */
export function soon(kind: Kind, topic: string, title: string): Step {
  return { kind, soon: true, topic, title, links: [] };
}
