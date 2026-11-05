# Neural networks, language models and transformers

The lecture material on neural networks of **Advanced Machine Learning** (252-0535-00L, ETH Zürich,
autumn semester 2026), in logical order, live at

https://eth-aml-hs26.github.io/neural-networks/

The page has an introduction and seven numbered sections: gradient descent, shallow ReLU networks,
deep ReLU networks, language models, attention, a neural language model, and transformers.
Within each section the visualizations come first, then the slides and the notebook.

| Kind | What |
|---|---|
| Visualizations | Nine pages that run in the browser: *Will it last?*, the four grasshopper pages on gradient descent, the hinge-fan and hinge-chain networks, the Wuggish game and *One layer of attention*. |
| Slides | Six decks, each as projected (a page for every click) and as a handout (a page per slide); two of them also as annotated in the lecture. The decks link the pages of this site wherever they refer to one. |
| Notebook | A tiny language model, to run in Google Colab. |

Every file is in [`public/`](public/): the decks in `slides/`, each page in
`viz/<name>/` (open its `index.html`; the pages work offline, from a downloaded copy too), and the
notebook in `notebooks/`.

## The site

A static site built with Vite, React and TypeScript, from the same recipe as the sibling course
sites of BMAI and CSCS.

```bash
npm install      # install dependencies
npm run dev      # dev server at http://localhost:5173
npm run build    # list public/, type-check with tsc -b, build into dist/
npm run preview  # serve the production build locally
npm run anchors  # check the pages at which rows open a deck (needs Python and pypdf)
```

`npm run build` is the correctness gate. It first writes `src/data/public-files.ts`, the list of
every PDF, notebook and page in `public/`, so the type check rejects a link to a file that is
missing.

## Editing content

- [`src/data/sequence.ts`](src/data/sequence.ts) holds the sections, in order. A row names a
  material by its id with a few words on what it covers, `step('viz/will-it-last', 'A linear model
  and one observation')`; `part()` opens a deck at one of its parts and `soon()` names material
  still to be made. The page groups the rows of a section by kind: visualizations, slides,
  notebook, notes.
- [`src/data/materials.ts`](src/data/materials.ts) holds the catalogue: one entry per material, with
  its kind, its title and its links.
- [`src/data/anchors.ts`](src/data/anchors.ts) holds the pages at which `part()` opens a deck, in
  the projected PDF, in the handout and, for a part with ink, in the annotated PDF. `npm run
  anchors` checks them against the PDFs.

The files in `public/slides/`, `public/notes/`, `public/viz/` and `public/notebooks/` are copies
from the private course repository, made by its script `scripts/publish_nn_site.py`; they are
replaced on every run of that script.

## Deployment

Pushing to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which builds
the site and publishes `dist/` to GitHub Pages. The relative `base: './'` in `vite.config.ts` keeps
every link working under the Pages subpath.
