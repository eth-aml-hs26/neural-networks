import type { Material } from '../types';
import { colab, file } from './links';

/**
 * Every material the site serves, one entry each. The id is the material's folder in
 * public/ without its extension: slides/<deck>, viz/<page>, notes/<note>,
 * notebooks/<notebook>. The sequence (sequence.ts) refers to an entry by its id, and the
 * section "All materials" lists every entry, grouped by kind in the order below.
 *
 * The files themselves are copies made by scripts/publish_nn_site.py of the private course
 * repository; to add a material, add it there, run the script, then add its entry here.
 */
export const materials = {
  // Slides: every deck as projected (a page per click) and its handout (a page per slide).
  'slides/experimental-studies': {
    kind: 'slides',
    title: 'The experimental studies',
    summary:
      'What happens, what counts, and what you decide: why the course runs randomized studies and what the trials of 2024 and 2025 found, the weeks of the two studies of this semester and their quizzes, how the quizzes count, and consent and data.',
    links: [
      { label: 'Slides', url: file('slides/experimental-studies-slides.pdf') },
      { label: 'Handout', url: file('slides/experimental-studies-handout.pdf') },
    ],
  },
  'slides/neural-networks-cold-intro': {
    kind: 'slides',
    title: 'William James, The Principles of Psychology',
    summary:
      'The cold intro of the week: five excerpts from James’s book of 1890, one for each part of the week, each beside one of his figures.',
    links: [
      { label: 'Slides', url: file('slides/neural-networks-cold-intro-slides.pdf') },
      { label: 'Handout', url: file('slides/neural-networks-cold-intro-handout.pdf') },
    ],
  },
  'slides/hinge-fan-networks': {
    kind: 'slides',
    title: 'Hinge-fan networks',
    summary:
      'One hidden layer, one hinge per kink: a hinge and its two numbers, a zigzag as a sum of weighted hinges, the network that draws it, and its weights by least squares.',
    links: [
      { label: 'Slides', url: file('slides/hinge-fan-networks-slides.pdf') },
      { label: 'Handout', url: file('slides/hinge-fan-networks-handout.pdf') },
    ],
  },
  'slides/hinge-chain-networks': {
    kind: 'slides',
    title: 'Hinge-chain networks',
    summary:
      'A ReLU network of width two that draws any continuous piecewise-linear function exactly, one kink per layer: the hinge lane, the sum lane and the free numbers of the construction.',
    links: [
      { label: 'Slides', url: file('slides/hinge-chain-networks-slides.pdf') },
      { label: 'Handout', url: file('slides/hinge-chain-networks-handout.pdf') },
    ],
  },
  'slides/language-models': {
    kind: 'slides',
    title: 'Language models',
    summary:
      'From a table to a neural network: texts as a tree of chances, the table of next-word chances and why no computer can store it, a network that computes its rows, the loss, training, and the tiny language model of the notebook.',
    links: [
      { label: 'Slides', url: file('slides/language-models-slides.pdf') },
      { label: 'Handout', url: file('slides/language-models-handout.pdf') },
    ],
  },
  'slides/attention': {
    kind: 'slides',
    title: 'Attention',
    summary:
      'How a word reads the words around it, on Wuggish, a toy language of eleven words in which a word is a row and a feature a column: queries, keys, scores and values by hand with zeros and ones, until the new row of “kat” lands on the row of “pussinbootz”; then the three blocks of weights, the softmax and the formula.',
    links: [
      { label: 'Slides', url: file('slides/attention-slides.pdf') },
      { label: 'Handout', url: file('slides/attention-handout.pdf') },
    ],
  },
  'slides/attention-cscs': {
    kind: 'slides',
    title: 'Attention and transformers, the workshop version',
    summary:
      'The workshop deck that the attention deck grew from, frame for frame: attention on Wuggish in its earlier encoding (sections 1 to 3), then multi-headed attention, cross-attention, masked self-attention, training a transformer, positional encodings, residual blocks and the transformer of Vaswani et al. (sections 4 to 10).',
    links: [
      { label: 'Slides', url: file('slides/attention-cscs-slides.pdf') },
      { label: 'Handout', url: file('slides/attention-cscs-handout.pdf') },
    ],
  },

  // Visualizations: pages that run in the browser, with nothing to install.
  'viz/will-it-last': {
    kind: 'viz',
    title: 'Will it last?',
    summary:
      'A quiz show on one observation: on day 17 of her 30-day plan, Lina’s phone shows 3 GB used. Guess the daily rate w in y = w x, find out whether the 5 GB last the month, and watch a program find w by guess, check and correct.',
    links: [{ label: 'Open', url: file('viz/will-it-last/index.html') }],
  },
  'viz/grasshopper-finds-w': {
    kind: 'viz',
    title: 'The grasshopper finds w',
    summary:
      'Gradient descent click by click on the same data plan: the loss of a guess, the slope a grasshopper measures with a small hop, and the update that moves w downhill.',
    links: [{ label: 'Open', url: file('viz/grasshopper-finds-w/index.html') }],
  },
  'viz/grasshoppers-find-w-and-b': {
    kind: 'viz',
    title: 'Two grasshoppers find w and b',
    summary:
      'One day of Lina’s heating and the model ŷ = ReLU(w x + b): two numbers to learn, a grasshopper for each, and the gradient as a pair.',
    links: [{ label: 'Open', url: file('viz/grasshoppers-find-w-and-b/index.html') }],
  },
  'viz/grasshoppers-many-days': {
    kind: 'viz',
    title: 'Two grasshoppers, eight days',
    summary:
      'The heating bill on eight days at once: a column per quantity with one cell per day, the loss of every day and their average.',
    links: [{ label: 'Open', url: file('viz/grasshoppers-many-days/index.html') }],
  },
  'viz/grasshopper-swarm': {
    kind: 'viz',
    title: 'Eight grasshoppers, four bends',
    summary:
      'Lina’s aphids fitted by a sum of four ReLUs: a hidden layer, a grasshopper for every number, and whether one box of ladybird larvae will do.',
    links: [{ label: 'Open', url: file('viz/grasshopper-swarm/index.html') }],
  },
  'viz/hinge-fan-networks': {
    kind: 'viz',
    title: 'Hinge-fan networks',
    summary:
      'Up to 24 hinges in one hidden layer: pick a target, drag the hinges, move their weights, or let least squares fit them.',
    links: [{ label: 'Open', url: file('viz/hinge-fan-networks/index.html') }],
  },
  'viz/hinge-chain-networks': {
    kind: 'viz',
    title: 'Hinge-chain networks',
    summary:
      'The width-two network of the deck: pick a target, add and remove layers, and set the free numbers of the construction, a gap in each hinge and a slope change on each arrow.',
    links: [{ label: 'Open', url: file('viz/hinge-chain-networks/index.html') }],
  },
  'viz/wuggish-game': {
    kind: 'viz',
    title: 'Wuggish in ten minutes',
    summary:
      'A game: learn eleven words of a made-up language from pictures, read 18 sentences whose words come in any order with every adjective before its noun, then see that what you did was attention.',
    links: [{ label: 'Open', url: file('viz/wuggish-game/index.html') }],
  },

  // Notes: texts to read at home.
  'notes/hinge-chain-networks': {
    kind: 'notes',
    title: 'Hinge-chain networks: lecture notes',
    summary:
      'The construction of the deck one part at a time, each with its figure, with the proofs and four solved exercises in the appendices. 12 pages.',
    links: [{ label: 'Notes', url: file('notes/hinge-chain-networks.pdf') }],
  },
  'notes/shallow-relu-networks': {
    kind: 'notes',
    title: 'A piecewise-linear function as a shallow ReLU network',
    summary:
      'The hinge-fan network worked out: why one number per hinge is enough, the weights by least squares, and how fast the error falls as hinges are added. 8 pages.',
    links: [{ label: 'Notes', url: file('notes/shallow-relu-networks.pdf') }],
  },
  'notes/narrow-relu-networks': {
    kind: 'notes',
    title: 'A piecewise-linear function as a deep, narrow ReLU network',
    summary:
      'The first write-up of the hinge chain, denser than the lecture notes: one kink per layer and the formula of every neuron. 5 pages.',
    links: [{ label: 'Notes', url: file('notes/narrow-relu-networks.pdf') }],
  },

  // Notebooks: open in Google Colab, or download and run anywhere.
  'notebooks/tiny_language_model': {
    kind: 'notebook',
    title: 'A tiny language model',
    summary:
      'Build and train a language model on six words with one attention layer, in the layout and notation of the deck. It trains in under a minute on Colab’s free CPU, with nothing to install.',
    links: [
      { label: 'Open in Colab', url: colab('notebooks/tiny_language_model.ipynb') },
      { label: 'Download', url: file('notebooks/tiny_language_model.ipynb'), download: true },
    ],
  },
} satisfies Record<string, Material>;

export type MaterialId = keyof typeof materials;
