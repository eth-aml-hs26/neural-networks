import type { Block } from '../types';
import { soon, step } from './steps';

/**
 * THE SEQUENCE: the order in which the site lists the material, lecture by lecture. Edit
 * this file to change the order; nothing else needs to change. A step names a material of
 * materials.ts by its id (tsc rejects an unknown id), and soon() names one still to be made.
 *
 * It follows the running order of the private course repository,
 * docs/lecture-plans/neural-networks-llms-transformers.md at commit e3834ab (30 October
 * 2026). The numbers in the comments are the items of that order. Item 1, the deck on the
 * experimental studies, is course administration and stays on Moodle.
 */

/** While true, the page says above the sequence that the order may still change. */
export const SEQUENCE_IS_DRAFT = true;

export const sequence: Block[] = [
  {
    title: 'Training and ReLU networks',
    when: 'Monday 2 November 2026, 10:15 to 12:00',
    summary:
      'Gradient descent on one number, then on two, on many days at once and on a hidden layer of ReLUs; then what such networks can draw, with one hidden layer and with many.',
    steps: [
      step('slides/neural-networks-cold-intro'), // 2
      step('viz/will-it-last'), // 3
      step('viz/grasshopper-finds-w'), // 4: step 0 of the grasshopper series
      step('viz/grasshoppers-find-w-and-b'), // 5: step 1
      step('viz/grasshoppers-many-days'), // 6: step 2
      step('viz/grasshopper-swarm'), // 7: step 3
      step('slides/hinge-fan-networks', { note: 'Frames 1 to 8.' }), // 8
      step('viz/hinge-fan-networks'), // 8, its page
      step('slides/hinge-chain-networks'), // 9
      step('viz/hinge-chain-networks'), // 9, its page
      step('notes/shallow-relu-networks', { note: 'To read after the lecture.' }),
      step('notes/hinge-chain-networks', { note: 'To read after the lecture.' }),
    ],
  },
  {
    title: 'Language models',
    when: 'Thursday 5 November 2026, 15:15 to 16:00',
    summary: 'A language model as a table of next-word chances, and a neural network that computes its rows.',
    steps: [
      step('slides/language-models', {
        note: 'Parts 1 to 5, up to the frame “The gradient flows back into every block of weights”.',
      }), // 10
    ],
  },
  {
    title: 'Attention and transformers',
    when: 'The next lecture, from Monday 9 November 2026',
    summary: 'How a row reads the other rows: attention, the notebook’s network, and the transformer.',
    steps: [
      step('slides/attention', { note: 'From the start to the frame “Play the Wuggish game”.' }), // 11
      step('viz/wuggish-game', { note: 'Played at that frame.' }), // 12
      step('slides/attention', { title: 'Attention, the rest of the deck', note: 'From the frame after the game to the end.' }), // 13
      step('slides/language-models', {
        title: 'Language models, part 6: the notebook',
        note: 'The network of the notebook, every block with its size, and its results.',
      }), // 14
      step('notebooks/tiny_language_model', { note: 'Run it in Colab after the lecture.' }), // 14
      soon(
        'Transformers',
        'Masked self-attention, positional encodings, residual blocks, multi-headed attention, the transformer of a language model, cross-attention, and writing one token at a time.',
      ), // 15
    ],
  },
];
