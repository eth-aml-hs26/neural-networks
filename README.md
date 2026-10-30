# Neural networks, language models and transformers

The material of the lectures on neural networks of **Advanced Machine Learning** (252-0535-00L,
ETH Zürich, autumn semester 2026), in the order we go through it, live at

https://eth-aml-hs26.github.io/neural-networks/

| Kind | What |
|---|---|
| Slides | Six decks, each as projected (a page for every click) and as a handout (a page per slide): the cold intro on William James, hinge-fan networks, hinge-chain networks, language models, attention, and the workshop version of attention and transformers, whose second half covers the transformer. The decks link the pages of this site wherever they refer to one. |
| Visualizations | Eight pages that run in the browser: the quiz show *Will it last?*, the four grasshopper pages on gradient descent, the hinge-fan and hinge-chain networks, and the Wuggish game. |
| Notes | The lecture notes on hinge-chain networks and two explainer notes on ReLU networks. |
| Notebook | A tiny language model, to run in Google Colab. |

Every file is in [`public/`](public/): the decks in `slides/`, the notes in `notes/`, each page in
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
```

`npm run build` is the correctness gate. It first writes `src/data/public-files.ts`, the list of
every PDF, notebook and page in `public/`, so the type check rejects a link to a file that is
missing.

## Editing content

- [`src/data/sequence.ts`](src/data/sequence.ts) holds the order: lectures, each a list of steps.
  A step names a material by its id, `step('viz/will-it-last')`, with an optional note on what to
  do with it at that point; `soon(title, summary)` names material still to be made.
- [`src/data/materials.ts`](src/data/materials.ts) holds the catalogue: one entry per material,
  with its title, a summary for students, and its links.

Links use the helpers of [`src/data/links.ts`](src/data/links.ts): `file('slides/attention-slides.pdf')`
for a file of `public/`, `colab('notebooks/tiny_language_model.ipynb')` for a notebook opened in
Colab, and `SOON` for a link whose file is still to come.

The files in `public/slides/`, `public/notes/`, `public/viz/` and `public/notebooks/` are copies
from the private course repository, made by its script `scripts/publish_nn_site.py`; they are
replaced on every run of that script.

## Deployment

Pushing to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which builds
the site and publishes `dist/` to GitHub Pages. The relative `base: './'` in `vite.config.ts` keeps
every link working under the Pages subpath.
