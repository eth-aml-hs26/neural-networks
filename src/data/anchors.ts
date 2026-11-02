import type { DeckName, DeckPages } from './links';

/**
 * Where a step opens a deck that it shows only in part: the page in the projected PDF
 * (slides) and in the handout, and a text that the first page of that part shows (expect).
 * The key is `<deck>#<part>`; part() in steps.ts takes it.
 *
 * The page numbers move when a deck gains or loses frames before them. After refreshing a
 * deck, run `npm run anchors` (scripts/check_anchors.py, which needs pypdf): it opens both
 * PDFs and fails unless each anchored page is the first one that shows its text. Keep one
 * anchor per line: the script reads this file line by line.
 */
export const anchors = {
  'language-models#3': { slides: 84, handout: 27, expect: 'A network computes the table' },
  'language-models#6': { slides: 171, handout: 54, expect: 'The notebook' },
  'attention-cscs#4': { slides: 81, handout: 22, expect: 'Multi-headed attention' },
  'attention-cscs#5': { slides: 94, handout: 25, expect: 'Cross-attention' },
  'attention-cscs#6': { slides: 103, handout: 28, expect: 'Masked self-attention' },
  'attention-cscs#6-architecture': { slides: 116, handout: 31, expect: 'A simplified transformer architecture' },
  'attention-cscs#7-generation': { slides: 155, handout: 38, expect: 'After training: one token at a time' },
  'attention-cscs#8': { slides: 161, handout: 39, expect: 'Positional encodings' },
  'attention-cscs#9': { slides: 177, handout: 44, expect: 'Residual blocks' },
  'attention-cscs#10': { slides: 182, handout: 47, expect: 'Transformer architecture' },
} satisfies Record<`${DeckName}#${string}`, DeckPages & { expect: string }>;

export type AnchorKey = keyof typeof anchors;
