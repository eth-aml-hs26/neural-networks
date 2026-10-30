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

## Depositing or changing the sequence

The order of the material is one file, `src/data/sequence.ts`. To deposit a new order:

1. Edit `sequence`: a list of blocks (a lecture: `title`, optional `when` and `summary`), each a
   list of steps. `step('<id>')` shows a material of the catalogue, with an optional `note` (what
   to do with it at that point, e.g. `'Frames 1 to 8.'`) and an optional `title` for a step that
   shows only part of a material. A material may appear in several steps. `soon(title, summary)`
   is a greyed placeholder for material still to be made, such as the transformer part.
2. Set `SEQUENCE_IS_DRAFT` to `false` once Carlos has confirmed the order; while it is `true`,
   the page says above the sequence that the order may still change.
3. `npm run build` (an unknown id fails the type check), then commit and push; the push deploys.

The ids are the keys of `src/data/materials.ts`: `slides/<deck>`, `viz/<page>`, `notes/<note>`,
`notebooks/<notebook>`, the path of the material in `public/` without its extension.

## Adding or refreshing material

Every file in `public/slides/`, `public/notes/`, `public/viz/` and `public/notebooks/` is a copy
made by `scripts/publish_nn_site.py` of `aml-hs26`. Never edit, add or delete a file in those four
folders by hand: the script rebuilds them from scratch on every run.

- **A deck, page, note or notebook was rebuilt in `aml-hs26`:** commit and push it there, run
  `python3 scripts/publish_nn_site.py` from `aml-hs26`, then `npm run build` here, commit and push.
  The script refuses to run when `aml-hs26` is behind its remote or a file it would copy has
  uncommitted changes.
- **A new material:** add it to the lists at the top of that script (`DECKS`, `NOTES`, `PAGES`,
  `NOTEBOOKS`), run it, add an entry to `src/data/materials.ts` (kind, title, a summary for
  students, links), then place it in the sequence. A page is copied with `index.html`, `css/`,
  `js/`, `vendor/` and `data/` only; its README, checks and dev scripts stay private.

## Files

| File | Role |
|---|---|
| `src/data/sequence.ts` | **The sequence.** Blocks of steps, rendered in order and numbered across blocks. |
| `src/data/materials.ts` | **The catalogue.** One entry per material; the section "All materials" lists them grouped by kind. |
| `src/data/steps.ts` | `step()` and `soon()`, which turn a catalogue entry or a placeholder into a step. |
| `src/data/links.ts` | `file()` for a file of `public/` (typed: the path must exist), `colab()` for a notebook opened in Colab from this repository, `SOON`, `REPO`. |
| `src/data/public-files.ts` | Written by `scripts/list-public-files.mjs` before every `dev` and `build` run, never committed: the type `PublicFile`, every PDF, notebook, zip and page `index.html` in `public/`. |
| `src/types.ts` | `Kind`, `Link`, `Material`, `Step`, `Block`. |
| `src/pages/HomePage.tsx` | The one page: the hero, the sequence, all materials. |
| `src/components/` | `Header` (the ETH logo and the anchors), `Footer`, `MaterialRow` (one row of the sequence or of the catalogue), `EthLogo`. |
| `src/index.css` | All styling: the ETH flat style of the BMAI and CSCS sites, one accent per kind of material. |
| `public/favicon.svg` | A ReLU hinge in white on ETH blue. |
| `public/slides/`, `notes/`, `viz/`, `notebooks/` | The copies, see above. |
| `.github/workflows/deploy.yml` | Builds on every push to `main` and publishes `dist/` to GitHub Pages. |

## Content state

- **DRAFT.** The sequence follows the running order that a session wrote on 30 October 2026,
  `docs/lecture-plans/neural-networks-llms-transformers.md` of `aml-hs26` at commit `7a143cc`:
  Monday 2 November (items 2 to 9 of that order, frame 9 of the hinge-fan deck after the chain, then
  the two notes to read), Thursday 5 November (item 10) and the slot after (items 11 to 15). Its
  item 1, the deck on the experimental studies, is course administration and stays on Moodle.
  Carlos agreed to the order that evening and had the cold intro and the hinge-fan deck aligned with
  it; `SEQUENCE_IS_DRAFT` stays `true` while the date of the slot after is open.
- The transformer step shows sections 4 to 10 of the workshop version (`slides/attention-cscs`, the
  CSCS deck in the course's format), in the order of the section "The transformer part, in order"
  of the running order, until a port in the new encoding of Wuggish exists.
- **OPEN.** The title pages say "Autumn semester 2026" until the lecture dates are set; when a deck
  is rebuilt for them, refresh the copies here. The attention deck and the game will be rebuilt on a
  new Wuggish (`docs/visualizations/wuggish-game/SPEC.md` of `aml-hs26`); refresh them here then.
- The copies match `aml-hs26` at commit `7a143cc` (30 October 2026).

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
