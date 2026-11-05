import type { Section } from '../types';
import { part, step } from './steps';

/**
 * THE ORDER: the sections of the page, in the logical order of the material. Edit this file
 * to change the order or the text; nothing else needs to change.
 *
 * Carlos asked on 1 November 2026 for the page to show the logical order, with minimal dry
 * text, visualizations first and then slides, since the page is part of the lecture. So
 * within a section the page lists the rows by kind, in the order of KIND_ORDER (HomePage.tsx):
 * visualizations, slides, notebook, notes. Rows of one kind keep the order written here.
 *
 * A row is step(id, topic, title?) for a whole material of materials.ts (tsc rejects an
 * unknown id), part(anchor, topic, title) for a deck opened at one of its parts (anchors.ts),
 * or soon(kind, topic, title) for material still to be made. `topic` is the bold line of the
 * row, in a few dry words; write $...$ around a formula to set it as math.
 *
 * The order follows the running order of the private course repository,
 * docs/lecture-plans/neural-networks-llms-transformers.md, by topic: the transformer
 * section follows its part "The transformer part, in order" (T2 to T8), on the workshop deck.
 */
export const sections: Section[] = [
  {
    id: 'introduction',
    title: 'Introduction',
    numbered: false,
    summary: 'The experimental studies of the course, and a prologue.',
    steps: [
      step('slides/experimental-studies', 'Course organisation'),
      step('slides/popper-cold-intro', 'Prologue'),
    ],
  },
  {
    id: 'gradient-descent',
    title: 'Gradient descent',
    summary:
      'Fitting the parameters of a model by gradient descent on the squared loss, from one parameter to one hidden layer.',
    steps: [
      step('viz/will-it-last', 'A linear model and one observation: $ŷ = wx$'),
      step('viz/grasshopper-finds-w', 'The derivative and the update rule'),
      step('viz/grasshoppers-find-w-and-b', 'Two parameters and a ReLU: $ŷ = ReLU(wx + b)$'),
      step('viz/grasshoppers-many-days', 'Several observations: the mean loss'),
      step('viz/grasshopper-swarm', 'One hidden layer: a sum of ReLUs'),
    ],
  },
  {
    id: 'shallow-networks',
    title: 'Shallow ReLU networks',
    summary: 'Continuous piecewise-linear functions as networks with one hidden layer of ReLUs.',
    steps: [
      step('viz/hinge-fan-networks', 'A weighted sum of hinges, fitted by hand or by least squares'),
    ],
  },
  {
    id: 'deep-networks',
    title: 'Deep ReLU networks',
    summary: 'The same functions as a ReLU network of width two, with one kink per layer, and how any network is trained.',
    steps: [
      step('viz/hinge-chain-networks', 'The free parameters, layer by layer'),
      step('slides/training-neural-networks', 'Any network: the forward pass and the backward pass'),
    ],
  },
  {
    id: 'language-models',
    title: 'Language models',
    summary: 'Next-word prediction as a table of conditional probabilities, and why the table is too large to store.',
    steps: [
      step(
        'slides/language-models',
        'The next-word table, and why it is too large to store',
        'Language models, parts 1 and 2',
      ),
    ],
  },
  {
    id: 'attention',
    title: 'Attention',
    summary: 'How each token reads the other tokens: queries, keys, scores and values.',
    steps: [
      step('viz/wuggish-game', 'A toy language read by attention'),
      step('viz/attention-walkthrough', 'One attention layer, matrix by matrix'),
      step('slides/attention', 'Queries, keys, scores and values; the attention mechanism'),
    ],
  },
  {
    id: 'tiny-language-model',
    title: 'A neural language model',
    summary:
      'A neural network that computes the next-word table, its loss and its training; a feed-forward network on a window of the last eleven words, trained on a language of six words.',
    steps: [
      part('language-models#3', 'The network that computes the table, the loss and training', 'Language models, parts 3 to 5'),
      part('language-models#6', 'The network and its results', 'Language models, part 6'),
      step('notebooks/tiny_language_model', 'Implementation and training in PyTorch'),
    ],
  },
  {
    id: 'transformers',
    title: 'Transformers',
    summary: 'From one attention layer to the transformer architecture.',
    steps: [
      part('attention-cscs#6', 'Masked self-attention', 'Attention and transformers, section 6'),
      part('attention-cscs#8', 'Positional encodings', 'Attention and transformers, section 8'),
      part('attention-cscs#9', 'Residual blocks', 'Attention and transformers, section 9'),
      part('attention-cscs#4', 'Multi-head attention', 'Attention and transformers, section 4'),
      part('attention-cscs#5', 'Cross-attention', 'Attention and transformers, section 5'),
      part('attention-cscs#6-architecture', 'A simplified transformer', 'Attention and transformers, end of section 6'),
      part('attention-cscs#10', 'The transformer of Vaswani et al. (2017)', 'Attention and transformers, section 10'),
      part('attention-cscs#7-generation', 'Generation, one token at a time', 'Attention and transformers, end of section 7'),
    ],
  },
];
