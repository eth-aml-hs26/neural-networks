# `neural-networks`: the public site of the AML lectures on neural networks

Public repository `github.com/eth-aml-hs26/neural-networks`, published by GitHub Pages at
https://eth-aml-hs26.github.io/neural-networks/. Created on 30 October 2026 at Carlos's request:
"a public Git repo where we're going to put all the materials that we have produced for the content
on neural networks and attention and transformers", with a website that shows the sequence. The
course and its private material live in the repository `eth-aml/aml-hs26`, checked out next to this
folder as `../aml-hs26/`; its `CLAUDE.md` is the wider context. This file covers only the site.

**This repository is public.** Nothing goes in it that may not be read by anyone: no student names,
no grades, no exam questions, no internal notes such as the PLAN.md and README files of the decks and
pages, no e-mails, no credentials.

## The page and its order

Since 1 November 2026 the page is part of the lecture, and Carlos asked for it so: "restructure it
so it contains minimal dry text and that it shows the logical order. First visualizations, then
slides. [...] I need the presentation to be a bit more academic [...] Dry text [that] just
explain[s] the minimum necessary for me to guide what each section contains." So the page is a
title block with a table of contents, then an unnumbered introduction and seven numbered sections
in logical order (gradient descent, shallow ReLU networks, deep ReLU networks, language models,
attention, a language model with attention, transformers). Each section has one dry sentence, and
its rows are grouped by kind in the order of `KIND_ORDER` in `HomePage.tsx`: visualizations first,
then slides, notebook, notes. A row is numbered n.i and shows a few dry words on what it covers
(the topic, in bold) above the material that covers it (in italics, linked). Keep the text that
dry: no stories, no summaries of the materials, no notes on how to use them.

The order and all of that text are one file, `src/data/sequence.ts`, a list of sections:

1. A row is `step('<id>', topic, title?)` for a whole material of the catalogue,
   `part('<deck>#<part>', topic, title)` for a deck opened at one of its parts, or
   `soon(kind, topic, title)`, a greyed placeholder for material still to be made. `title`
   replaces the material's own title, e.g. `'Language models, parts 1 and 2'`. In a topic,
   `$...$` sets a formula as LaTeX sets math (variables in serif italic, `ReLU` upright).
2. A part's pages live in `src/data/anchors.ts`, one per line: the page of the projected PDF, the
   page of the handout, and a text that the part's first page shows. Read the pages off the PDF's
   bookmarks or text (pypdf), then run `npm run anchors`.
3. `npm run build` (an unknown id or anchor fails the type check), then commit and push; the
   push deploys.

The ids are the keys of `src/data/materials.ts`: `slides/<deck>`, `viz/<page>`, `notes/<note>`,
`notebooks/<notebook>`, the path of the material in `public/` without its extension. An entry holds
only the kind, the material's own title and its links; what a row says lives in the sequence.

## Adding or refreshing material

Every file in `public/slides/`, `public/notes/`, `public/viz/` and `public/notebooks/` is a copy
made by `scripts/publish_nn_site.py` of `aml-hs26`. Never edit, add or delete a file in those four
folders by hand: the script rebuilds them from scratch on every run.

- **A deck, page, note or notebook was rebuilt in `aml-hs26`:** commit and push it there, run
  `python3 scripts/publish_nn_site.py` from `aml-hs26`, then `npm run build` and `npm run anchors`
  here, commit and push. The script refuses to run when `aml-hs26` is behind its remote or a file
  it would copy has uncommitted changes. A deck that gained or lost frames moves the pages of its
  anchors: `npm run anchors` names each one that moved.
- **A new material:** add it to the lists at the top of that script (`DECKS`, `NOTES`, `PAGES`,
  `NOTEBOOKS`), run it, add an entry to `src/data/materials.ts` (kind, title, links), then give it
  a row in its section of the sequence. A page is copied with `index.html`, `css/`, `js/`,
  `vendor/` and `data/` only; its README, checks and dev scripts stay private.

## Files

| File | Role |
|---|---|
| `src/data/sequence.ts` | **The order and the text.** The sections, each with its sentence and its rows. |
| `src/data/materials.ts` | **The catalogue.** One entry per material: kind, title, links. |
| `src/data/anchors.ts` | The pages at which `part()` opens a deck, checked by `scripts/check_anchors.py`. |
| `src/data/steps.ts` | `step()`, `part()` and `soon()`, which turn a catalogue entry, an anchor or a placeholder into a row. |
| `src/data/links.ts` | `file()` for a file of `public/` (typed: the path must exist), `deckLinks()` for the two PDFs of a deck, optionally at a page, `colab()` for a notebook opened in Colab from this repository, `SOON`, `REPO`. |
| `src/data/public-files.ts` | Written by `scripts/list-public-files.mjs` before every `dev` and `build` run, never committed: the type `PublicFile`, every PDF, notebook, zip and page `index.html` in `public/`. |
| `src/types.ts` | `Kind`, `Link`, `Material`, `Step`, `Section`. |
| `src/pages/HomePage.tsx` | The one page: the title block with the contents, then the sections, each grouped by kind in the order of `KIND_ORDER`. |
| `src/components/` | `Header` (the ETH logo, Contents, Source), `Footer`, `MaterialRow` (one row, and `Formula`, which sets the `$...$` of a topic), `EthLogo`. |
| `src/index.css` | All styling: the ETH flat style of the BMAI and CSCS sites made sober, ETH blue as the one accent. |
| `scripts/check_anchors.py` | `npm run anchors`: opens both PDFs of every anchored deck and fails unless each anchored page is the first that shows its text. Needs pypdf; run it locally, CI does not. |
| `public/favicon.svg` | A ReLU hinge in white on ETH blue. |
| `public/slides/`, `notes/`, `viz/`, `notebooks/` | The copies, see above. |
| `.github/workflows/deploy.yml` | Builds on every push to `main` and publishes `dist/` to GitHub Pages. |

## Content state

- The sections follow the running order of `aml-hs26`,
  `docs/lecture-plans/neural-networks-llms-transformers.md`, regrouped by topic on 1 November 2026
  with visualizations first: within a section a page comes before its deck (the Wuggish game before
  the whole attention deck). The introduction holds the deck on the experimental studies (its
  frames quote the contact addresses of the study's information sheet) and the cold intro on
  William James.
- On 2 November 2026 Carlos took the slides and the notes of the shallow and deep ReLU networks
  off the site: the hinge-fan and hinge-chain decks, the notes on hinge-chain, shallow and narrow
  ReLU networks, and frame 9 of the hinge-fan deck. Sections 2 and 3 show only their pages, and
  the site serves no notes. The same day the parts of the language model deck were split as he
  asked: parts 1 and 2 (the table, too big to store) in section 4; parts 3 to 5 (the network, the
  loss, training) in section 6, before part 6 (the notebook's network and its results) and the
  notebook.
- The page names no dates and no frames to skip: the running order keeps those.
- The transformer section opens the workshop version (`slides/attention-cscs`, the CSCS deck in
  the course's format) at seven of its parts, in the order of the section "The transformer part,
  in order" of the running order (T2 to T8), until a port in the new encoding of Wuggish exists.
- **OPEN.** The title pages say "Autumn semester 2026" until the lecture dates are set; when a deck
  is rebuilt for them, refresh the copies here. The game and the attention deck run on the
  Wuggish of a cat, a duck and a fish (`docs/visualizations/wuggish-game/SPEC.md` of `aml-hs26`);
  the game has 12 sentences, three a lesson, since 1 November 2026. The page *One layer of
  attention* (`docs/visualizations/attention-walkthrough/` of `aml-hs26`) is not published here.

## The decks link this site

Since 30 October 2026 the decks of `aml-hs26` link this site wherever a slide refers to a page:
every mention of a page links `viz/<page>/`, a frame that sends the room to a page prints its
address (the Wuggish game's frame adds a QR code), and the language model deck opens the notebook
in Colab from `public/notebooks/tiny_language_model.ipynb` on `main`. The addresses are written in
`docs/slides/nn-site.tex` of `aml-hs26`, and `scripts/publish_nn_site.py` refuses to run when a deck
links a page or notebook that it would not publish. PDFs that students have keep those links, so
keep the folder names of the pages, the name of the notebook and the base `./` of the build.

## Deployment

Push to `main` deploys. The Pages source was set to **GitHub Actions** when the repository was
created (30 October 2026). Build locally with `npm run build` before pushing; it is the only
correctness gate.

## Keeping this file current

After a change to the structure of the site, to how the copies are made or to the state of the
sequence, update this file in the same commit. It describes the present state; git keeps the
history.
