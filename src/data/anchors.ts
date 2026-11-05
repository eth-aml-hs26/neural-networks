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
  'transformers#multi-head': { slides: 2, handout: 2, expect: 'Multi-head attention' },
  'transformers#masked': { slides: 19, handout: 8, expect: 'Masked self-attention' },
  'transformers#cross': { slides: 34, handout: 12, expect: 'Cross-attention' },
  'transformers#positions': { slides: 45, handout: 16, expect: 'Positional encodings' },
  'transformers#residual': { slides: 67, handout: 23, expect: 'Residual blocks' },
  'transformers#simplified': { slides: 78, handout: 28, expect: 'The transformer' },
  'transformers#vaswani': { slides: 90, handout: 31, expect: 'The five parts in the transformer of Vaswani' },
  'convolutional-neural-networks#6': { slides: 39, handout: 27, expect: 'Training a CNN to count islands' },
  'diffusion-models#conditional': { slides: 17, handout: 7, expect: 'Conditional diffusion models' },
} satisfies Record<`${DeckName}#${string}`, DeckPages & { expect: string }>;

export type AnchorKey = keyof typeof anchors;
