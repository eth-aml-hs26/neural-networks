/** What a material is. Within a section, the page lists the kinds in the order of KIND_ORDER. */
export type Kind = 'viz' | 'slides' | 'notebook' | 'notes';

/** One button on a row: a PDF or a page to open, a notebook to download, Colab. */
export interface Link {
  label: string;
  /** From file(), deckLinks() or colab() in data/links.ts, or SOON while the file is not here yet. */
  url: string;
  /** True for a file the browser should save rather than show (a notebook). */
  download?: boolean;
}

/** One entry of the catalogue in data/materials.ts. */
export interface Material {
  kind: Kind;
  /** The material's own title, as its first page shows it. */
  title: string;
  /** The first link is the one the title opens. */
  links: Link[];
}

/** One numbered row of a section, made by step(), part() or soon() in data/steps.ts. */
export interface Step {
  kind: Kind;
  /** True for a placeholder: material still to be made, shown greyed out with no link. */
  soon?: boolean;
  /** What the row covers, in a few dry words: the bold line of the row. */
  topic: string;
  /** The material, or the part of it, that covers it: the linked line of the row. */
  title: string;
  links: Link[];
}

/** A numbered section of the page: one topic, its steps grouped by kind. */
export interface Section {
  /** The anchor of the section, e.g. 'attention' for #attention. */
  id: string;
  title: string;
  /** One dry sentence: what the section contains. */
  summary: string;
  /** False for the introduction: no number, in the contents or on its rows. */
  numbered?: boolean;
  steps: Step[];
}
