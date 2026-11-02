import type { Material } from '../types';
import { colab, deckLinks, file } from './links';

/**
 * Every material the site serves, one entry each: its kind, its own title and its links. The
 * id is the material's path in public/ without its extension: slides/<deck>, viz/<page>,
 * notes/<note>, notebooks/<notebook>. The sections (sequence.ts) refer to an entry by its id;
 * what a row says about the material is written there, next to its place in the order.
 *
 * The files themselves are copies made by scripts/publish_nn_site.py of the private course
 * repository; to add a material, add it there, run the script, then add its entry here.
 */
export const materials = {
  // Visualizations: pages that run in the browser, with nothing to install.
  'viz/will-it-last': {
    kind: 'viz',
    title: 'Will it last?',
    links: [{ label: 'Open', url: file('viz/will-it-last/index.html') }],
  },
  'viz/grasshopper-finds-w': {
    kind: 'viz',
    title: 'The grasshopper finds w',
    links: [{ label: 'Open', url: file('viz/grasshopper-finds-w/index.html') }],
  },
  'viz/grasshoppers-find-w-and-b': {
    kind: 'viz',
    title: 'Two grasshoppers find w and b',
    links: [{ label: 'Open', url: file('viz/grasshoppers-find-w-and-b/index.html') }],
  },
  'viz/grasshoppers-many-days': {
    kind: 'viz',
    title: 'Two grasshoppers, eight days',
    links: [{ label: 'Open', url: file('viz/grasshoppers-many-days/index.html') }],
  },
  'viz/grasshopper-swarm': {
    kind: 'viz',
    title: 'Eight grasshoppers, four bends',
    links: [{ label: 'Open', url: file('viz/grasshopper-swarm/index.html') }],
  },
  'viz/hinge-fan-networks': {
    kind: 'viz',
    title: 'Hinge-fan networks',
    links: [{ label: 'Open', url: file('viz/hinge-fan-networks/index.html') }],
  },
  'viz/hinge-chain-networks': {
    kind: 'viz',
    title: 'Hinge-chain networks',
    links: [{ label: 'Open', url: file('viz/hinge-chain-networks/index.html') }],
  },
  'viz/wuggish-game': {
    kind: 'viz',
    title: 'Wuggish in ten minutes',
    links: [{ label: 'Open', url: file('viz/wuggish-game/index.html') }],
  },

  // Slides: every deck as projected (a page per click) and as a handout (a page per frame).
  'slides/experimental-studies': {
    kind: 'slides',
    title: 'The experimental studies',
    links: deckLinks('experimental-studies'),
  },
  'slides/popper-cold-intro': {
    kind: 'slides',
    title: 'Karl Popper, the tetradic schema',
    links: deckLinks('popper-cold-intro'),
  },
  'slides/training-neural-networks': {
    kind: 'slides',
    title: 'Training a neural network',
    links: deckLinks('training-neural-networks'),
  },
  'slides/language-models': {
    kind: 'slides',
    title: 'Language models',
    links: deckLinks('language-models'),
  },
  'slides/attention': {
    kind: 'slides',
    title: 'Attention',
    links: deckLinks('attention'),
  },
  'slides/attention-cscs': {
    kind: 'slides',
    title: 'Attention and transformers',
    links: deckLinks('attention-cscs'),
  },

  // Notebooks: open in Google Colab, or download and run anywhere.
  'notebooks/tiny_language_model': {
    kind: 'notebook',
    title: 'A tiny language model',
    links: [
      { label: 'Colab', url: colab('notebooks/tiny_language_model.ipynb') },
      { label: 'Download', url: file('notebooks/tiny_language_model.ipynb'), download: true },
    ],
  },
} satisfies Record<string, Material>;

export type MaterialId = keyof typeof materials;
