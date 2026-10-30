/** What a material is. It sets the tag on its row and its group under "All materials". */
export type Kind = 'slides' | 'viz' | 'notes' | 'notebook';

/** One button on a row: a PDF or a page to open, a notebook to download, Colab. */
export interface Link {
  label: string;
  /** From file() or colab() in data/links.ts, or SOON while the file is not here yet. */
  url: string;
  /** True for a file the browser should save rather than show (a notebook). */
  download?: boolean;
}

/** One entry of the catalogue in data/materials.ts. */
export interface Material {
  kind: Kind;
  title: string;
  /** One or two sentences for students: what it shows and what to do with it. */
  summary: string;
  /** The first link is the one the title opens. */
  links: Link[];
}

/** One numbered row of the sequence, made by step() or soon() in data/steps.ts. */
export interface Step {
  /** 'soon' for a placeholder: material still to be made, shown greyed out. */
  kind: Kind | 'soon';
  title: string;
  summary: string;
  links: Link[];
  /** What to do with the material at this point, e.g. "Frames 1 to 8.". */
  note?: string;
}

/** A group of steps under one heading: a lecture, or a part of one. */
export interface Block {
  title: string;
  /** Date and time, e.g. "Monday 2 November 2026, 10:15 to 12:00". */
  when?: string;
  summary?: string;
  steps: Step[];
}
