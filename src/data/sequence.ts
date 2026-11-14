import type { Section } from '../types';
import { step } from './steps';

/**
 * THE ORDER: the sections of the page, in the logical order of the material. Edit this file
 * to change the order or the text; nothing else needs to change.
 *
 * Carlos asked on 1 November 2026 for the page to show the logical order, with minimal dry
 * text, visualizations first and then slides, since the page is part of the lecture. So
 * within a section the page lists the rows by kind, in the order of KIND_ORDER (HomePage.tsx):
 * visualizations, slides, notebook, notes. Rows of one kind keep the order written here.
 *
 * A row is step(id, topic) for a whole material of materials.ts (tsc rejects an unknown id), or
 * soon(kind, topic, title) for material still to be made. `topic` is the bold line of the row,
 * in a few dry words; write $...$ around a formula to set it as math.
 *
 * Every material has one row, in one section: a deck is shown whole, with one link per PDF
 * (Carlos, 12 November 2026: "Just for one slide deck, there is only one link").
 *
 * The order follows the running order of the private course repository,
 * docs/lecture-plans/neural-networks-llms-transformers.md, by topic. The cold intro on
 * Wittgenstein is the prologue to sections 5 and 6, and the one on Leonardo to sections 7 to 9.
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
    summary:
      'Next-word prediction as a table of conditional probabilities, too large to store, and a neural network that computes it, with its loss and its training; a feed-forward network on a window of the last eleven words, trained on a language of six words.',
    steps: [
      step(
        'slides/language-models',
        'The next-word table; the network that computes it, its loss, its training and its results',
      ),
      step('notebooks/tiny_language_model', 'Implementation and training in PyTorch'),
    ],
  },
  {
    id: 'prologue-attention',
    title: 'Prologue to sections 5 and 6',
    numbered: false,
    summary: 'Ludwig Wittgenstein on language: excerpts of the Philosophische Untersuchungen and The Brown Book.',
    steps: [step('slides/wittgenstein-cold-intro', 'Four excerpts')],
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
    id: 'transformers',
    title: 'Transformers',
    summary: 'From one attention layer to the transformer architecture.',
    steps: [
      step(
        'slides/transformers',
        'Multi-head, masked and cross-attention; positional encodings; residual blocks; the architecture',
      ),
    ],
  },
  {
    id: 'prologue-images',
    title: 'Prologue to sections 7 to 9',
    numbered: false,
    summary: 'Leonardo da Vinci on painting: one excerpt for each of the three sections that follow.',
    steps: [step('slides/leonardo-cold-intro', 'Three excerpts, one per section')],
  },
  {
    id: 'convolutional-networks',
    title: 'Convolutional neural networks',
    summary:
      'Filters slid over an image, pooling, and the network that classifies images, trained on CIFAR-10.',
    steps: [
      step('viz/tetris-tiles', 'Counting islands: an image decomposed into tiles'),
      step('slides/convolutional-filters', 'Filters, activations and pooling on images of islands'),
      step(
        'slides/convolutional-neural-networks',
        'Filters, pooling, the network and softmax; image classification on CIFAR-10: the problem, training, the layers of a CNN',
      ),
    ],
  },
  {
    id: 'u-nets',
    title: 'U-Nets',
    summary:
      'Deconvolutional filters, which make a feature map larger, and the U-Net of Ronneberger, Fischer and Brox (2015), which turns an image into a segmentation map.',
    steps: [
      step('viz/deconvolution', 'A deconvolutional filter on a 2 by 2 input'),
      step('slides/u-nets', 'The input and the output of a U-Net, its training; the U-Net, built up level by level'),
    ],
  },
  {
    id: 'diffusion-models',
    title: 'Diffusion models',
    summary:
      'Images generated by removing noise step by step, generation conditioned on a text, and denoising diffusion probabilistic models (DDPM).',
    steps: [
      step(
        'slides/diffusion-models',
        'The forward and backward process, training, what the model learns; conditional diffusion and its training',
      ),
      step(
        'slides/ddpm',
        "DDPM: the forward process and its closed form, the step back by Bayes' rule, a network that predicts the noise; training and sampling",
      ),
    ],
  },
  {
    id: 'langevin-sampling',
    title: 'Sampling with Langevin dynamics',
    summary:
      'Random steps that end at the distribution of the data, its score learned from samples, annealed Langevin sampling, and its relation to diffusion models.',
    steps: [
      step(
        'slides/langevin-sampling',
        'Itô calculus, the Fokker-Planck equation, score matching, annealed Langevin sampling, the relation to diffusion models',
      ),
      step('notebooks/langevin_sampling', 'Score matching and annealed Langevin sampling on a distribution with two bumps'),
    ],
  },
];
