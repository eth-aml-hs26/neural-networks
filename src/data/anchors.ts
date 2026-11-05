import type { DeckName, DeckPages } from './links';

/**
 * Where a step opens a deck that it shows only in part: the page in the projected PDF
 * (slides) and in the handout, and a text that the first page of that part shows (expect).
 * A part that Carlos wrote on in class also gives its page in the annotated PDF (annotated),
 * which the button Annotated opens. The key is `<deck>#<part>`; part() in steps.ts takes it.
 *
 * The page numbers move when a deck gains or loses frames before them. After refreshing a
 * deck, run `npm run anchors` (scripts/check_anchors.py, which needs pypdf): it opens both
 * PDFs and fails unless each anchored page is the first one that shows its text. Keep one
 * anchor per line: the script reads this file line by line.
 */
export const anchors = {
  'language-models#3': { slides: 84, handout: 27, annotated: 27, expect: 'A network computes the table' },
  'language-models#6': { slides: 176, handout: 55, annotated: 56, expect: 'The notebook' },
  'convolutional-neural-networks#6': { slides: 39, handout: 27, expect: 'Training a CNN to count islands' },
  'diffusion-models#conditional': { slides: 17, handout: 7, expect: 'Conditional diffusion models' },
} satisfies Record<`${DeckName}#${string}`, DeckPages & { expect: string }>;

export type AnchorKey = keyof typeof anchors;
