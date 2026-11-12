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
title block with a table of contents, then an unnumbered introduction and six numbered sections
in logical order (gradient descent, shallow ReLU networks, deep ReLU networks, language models,
attention, transformers, with an unnumbered prologue, the cold intro on Wittgenstein, before
sections 5 and 6), then an unnumbered prologue and three numbered sections on images
(convolutional neural networks, U-Nets, diffusion models), and section 10, sampling with Langevin
dynamics. Each section has one dry sentence, and its rows are grouped by kind in the order of
`KIND_ORDER` in `HomePage.tsx`: visualizations first, then slides, notebook, notes. A row is
numbered n.i and shows a few dry words on what it covers (the topic, in bold) above the material
that covers it (in italics, linked). Keep the text that dry: no stories, no summaries of the
materials, no notes on how to use them.

Every material has one row, in one section, and a deck shows whole: one button per PDF, each
opening it at its first page. Carlos asked for this on 12 November 2026: "Just for one slide deck,
there is only one link. Make it one-to-one, not many sections in the website to one slide deck.
Don't break slide decks into multiple sections on the website." `scripts/check-one-row.mjs` fails
the build when a material has two rows or two catalogue entries link one file.

The order and all of that text are one file, `src/data/sequence.ts`, a list of sections:

1. A row is `step('<id>', topic)` for a material of the catalogue, under its own title, or
   `soon(kind, topic, title)`, a greyed placeholder for material still to be made. In a topic,
   `$...$` sets a formula as LaTeX sets math (variables in serif italic, `ReLU` upright).
2. `npm run build` (an unknown id fails the type check, a second row of a material fails
   `scripts/check-one-row.mjs`), then commit and push; the push deploys.

The ids are the keys of `src/data/materials.ts`: `slides/<deck>`, `viz/<page>`, `notes/<note>`,
`notebooks/<notebook>`, the path of the material in `public/` without its extension. An entry holds
only the kind, the material's own title and its links; what a row says lives in the sequence.

## Adding or refreshing material

Every file in `public/slides/`, `public/notes/`, `public/viz/` and `public/notebooks/` is a copy
made by `scripts/publish_nn_site.py` of `aml-hs26`. Never edit, add or delete a file in those four
folders by hand: the script rebuilds them from scratch on every run.

- **A deck, page, note or notebook was rebuilt in `aml-hs26`:** commit and push it there, run
  `python3 scripts/publish_nn_site.py` from `aml-hs26`, then `npm run build` here, commit and
  push. The script refuses to run when `aml-hs26` is behind its remote or a file it would copy has
  uncommitted changes; while another session holds such changes, publish from a sparse clone, as
  the `CLAUDE.md` of `aml-hs26` says.
- **A PDF that Carlos wrote on in class:** the export from his iPad is kept unchanged in
  `aml-hs26` as `docs/slides/<deck>/<deck>-annotated.pdf`, and the script copies it when the deck
  is in its list `ANNOTATED`. Then add the button Annotated (`annotatedLink()` in
  `src/data/links.ts`) to the deck's entry in the catalogue; it opens the export at its first page.
- **A new material:** add it to the lists at the top of that script (`DECKS`, `NOTES`, `PAGES`,
  `NOTEBOOKS`), run it, add an entry to `src/data/materials.ts` (kind, title, links), then give it
  a row in its section of the sequence. A page is copied with `index.html`, `css/`, `js/`,
  `vendor/`, `data/` and `img/` only; its README, checks and dev scripts stay private.

## Files

| File | Role |
|---|---|
| `src/data/sequence.ts` | **The order and the text.** The sections, each with its sentence and its rows. |
| `src/data/materials.ts` | **The catalogue.** One entry per material: kind, title, links. |
| `src/data/steps.ts` | `step()` and `soon()`, which turn a catalogue entry or a placeholder into a row. |
| `src/data/links.ts` | `file()` for a file of `public/` (typed: the path must exist), `deckLinks()` for the two PDFs of a deck, `annotatedLink()` for the PDF that Carlos wrote on in class, `colab()` for a notebook opened in Colab from this repository, `SOON`, `REPO`. |
| `src/data/public-files.ts` | Written by `scripts/list-public-files.mjs` before every `dev` and `build` run, never committed: the type `PublicFile`, every PDF, notebook, zip and page `index.html` in `public/`. |
| `src/types.ts` | `Kind`, `Link`, `Material`, `Step`, `Section`. |
| `src/pages/HomePage.tsx` | The one page: the title block with the contents, then the sections, each grouped by kind in the order of `KIND_ORDER`. |
| `src/components/` | `Header` (the ETH logo, Contents, Source), `Footer`, `MaterialRow` (one row, and `Formula`, which sets the `$...$` of a topic), `EthLogo`. |
| `src/index.css` | All styling: the ETH flat style of the BMAI and CSCS sites made sober, ETH blue as the one accent. |
| `scripts/check-one-row.mjs` | `npm run rows`, run by `build` before the type check: fails when a material has two rows in the sequence, or two entries of the catalogue link one file of `public/`. |
| `public/favicon.svg` | A ReLU hinge in white on ETH blue. |
| `public/slides/`, `notes/`, `viz/`, `notebooks/` | The copies, see above. |
| `.github/workflows/deploy.yml` | Builds on every push to `main` and publishes `dist/` to GitHub Pages. |

## Content state

- The sections follow the running order of `aml-hs26`,
  `docs/lecture-plans/neural-networks-llms-transformers.md`, regrouped by topic on 1 November 2026
  with visualizations first: within a section a page comes before its deck (the Wuggish game before
  the whole attention deck). The introduction holds the deck on the experimental studies (its
  frames quote the contact addresses of the study's information sheet) and the cold intro, Popper's
  tetradic schema as shown at the CSCS workshop (since 2 November 2026; until then William James).
- On 2 November 2026 section 3 gained, as its last row, one slide on training any network
  (`slides/training-neural-networks`: X and y, the layers as blocks, the forward and the backward
  pass), which generalizes sections 2 and 3 before the language models.
- On 2 November 2026 Carlos took the slides and the notes of the shallow and deep ReLU networks
  off the site: the hinge-fan and hinge-chain decks, the notes on hinge-chain, shallow and narrow
  ReLU networks, and frame 9 of the hinge-fan deck. Sections 2 and 3 show only their pages, and
  the site serves no notes.
- On 4 November 2026 the notebook lost its attention layer: its network reads a window of the last
  11 words through two plain layers, and part 6 of the language model deck presents it so.
- Section 4 holds the whole language model deck and its notebook, before attention: the attention
  deck's first frame assumes the network, the loss and training.
- The page names no dates and no frames to skip: the running order keeps those.
- Since 5 November 2026 the transformer section shows a deck of its own, `slides/transformers`
  (`docs/slides/transformers/` of `aml-hs26`), whole, in one row. Its parts, in the order Carlos
  gave that day: multi-head attention, masked self-attention, cross-attention, positional encodings, residual
  blocks, a simplified transformer, and the transformer of Vaswani et al. (2017). It has the
  notation of the attention deck and covers the architecture only, since the language model deck
  covers training. Until the evening of that day the section opened it at each of its seven parts,
  which Carlos found too fragmented, and before that the workshop version (`slides/attention-cscs`)
  at eight of its parts, the last one generating a text one token at a time; the site no longer
  serves that deck.
- Since 5 November 2026 an unnumbered prologue to the sections on attention and transformers, now
  5 and 6, comes before attention:
  `slides/wittgenstein-cold-intro`, the cold intro on Wittgenstein, built that day for the attention
  deck and then made a deck of its own (`docs/slides/wittgenstein-cold-intro/` of `aml-hs26`), which
  Carlos asked to have on the site. Since that night the attention deck opens on its title page, so
  the site shows the frames once.
- On 5 November 2026 the section on attention (now 5) gained, after the game, the page
  *One layer of attention* (`viz/attention-walkthrough`, from
  `docs/visualizations/attention-walkthrough/` of `aml-hs26`): one attention layer on the sentence of the attention deck, worked out matrix by matrix. Its
  script loads two pictures from `img/`, which the publish script copies since that day.
- On 5 November 2026, at Carlos's request, the site gained the PDFs he wrote on in class that day,
  `slides/<deck>-annotated.pdf`: the training slide, with three pages he added after the title
  (row 3.2), and the language model handout, with ink on parts 3, 4 and 6 and two pages he added
  (row 4.1). Those rows have a third button, Annotated, which the legend under the title explains.
- On 9 November 2026 the site gained the slides he wrote on in class that day: the attention deck,
  with ink on nine pages and a copy he made of one of them (row 5.3), and the transformer deck,
  with ink on six pages (row 6.1).
- On 5 November 2026 Carlos asked for the block on convolutions, U-Nets and diffusion of
  `aml-hs26` (`docs/lecture-plans/convolutions-unets-diffusion.md`) as a new section of this page,
  "in an adequate order and structure". It follows the transformers in the order of that file: an
  unnumbered prologue, the Leonardo cold intro (three excerpts of the *Trattato della pittura*, one
  per section that follows); 7, convolutional neural networks (the tiles page with its islands, the
  convolutional filters deck, the CNN deck); 8, U-Nets (the deconvolution page, the U-Net deck); 9,
  diffusion models (the deck of the CSCS workshop). The page's title became "Neural networks" the
  same day.
- On 11 November 2026 Carlos asked for the deck *Sampling with Langevin dynamics* of `aml-hs26`
  (`docs/slides/langevin-sampling/`) and its notebook (`docs/notebooks/langevin-sampling/`) as a new
  section of this page: section 10, after diffusion models, to which the deck's last two frames tie
  annealed Langevin sampling. Two rows: the whole deck, and the notebook
  (`notebooks/langevin_sampling`), which runs the deck's Algorithms 2 to 4 on a distribution with two
  bumps.
- On 12 November 2026 Carlos asked for one row per deck (section "The page and its order"). Until
  then the language model deck had a row in section 4 (parts 1 and 2) and two in a section of its
  own on the neural language model (parts 3 to 5 and part 6, each opened at its page), and the CNN
  and diffusion decks two rows each. That section joined section 4, so the sections after it moved
  up by one, and `part()`, `src/data/anchors.ts` and `npm run anchors` went.
- **OPEN.** The title pages say "Autumn semester 2026" until the lecture dates are set; when a deck
  is rebuilt for them, refresh the copies here. The game, the attention deck and *One layer of
  attention* run on the Wuggish of a cat, a duck and a fish
  (`docs/visualizations/wuggish-game/SPEC.md` of `aml-hs26`); the game has 12 sentences, three a
  lesson, since 1 November 2026.

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
