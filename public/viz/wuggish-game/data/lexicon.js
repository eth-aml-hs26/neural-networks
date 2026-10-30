/* lexicon.js : the vocabulary of Wuggish, locked 2026-09-02.
 *
 * Wuggish is a sister language of English: every word is the English word
 * one step away, by four rules (see BMAI's docs/lexicon.md).  The game never
 * shows the English gloss before the reveal; the gloss here is for the reveal
 * and for the item generator.
 *
 * `flag` is the modifier name that js/art.js understands, and `nouns` lists
 * the nouns an adjective may attach to.  `streept` is the one shared word.
 *
 * The features, added in AML on 2026-10-30, are what the reveal computes
 * with (js/vectors.js).  A thing is nine yes-or-no answers, the `features`
 * below in the order of the table's columns: four say what kind of thing it
 * is, five say how it looks.  A noun's row is a 1 in each of its `kinds`; an
 * adjective's row is a 1 in its look, its `feature`.  `fits` is the grammar:
 * the kind of thing that look goes with.  An adjective scores 1 with exactly
 * the nouns whose kinds contain its `fits`, which is its `nouns` list again;
 * scripts/check-vectors.js asserts that.
 *
 * The attention deck (docs/slides/attention/figures.py) reads the noun and
 * adjective lines below with regular expressions, so keep every word on one
 * line, with the field syntax as it is.
 */
window.LEXICON = {
  name: 'Wuggish',

  // the nine features, the columns of the table, in this order
  features: [
    { name: 'animal',  question: 'an animal?',    group: 'kind' },
    { name: 'paws',    question: 'paws?',         group: 'kind' },
    { name: 'reptile', question: 'a reptile?',    group: 'kind' },
    { name: 'object',  question: 'an object?',    group: 'kind' },
    { name: 'stripes', question: 'stripes?',      group: 'look' },
    { name: 'boots',   question: 'boots?',        group: 'look' },
    { name: 'venom',   question: 'venom?',        group: 'look' },
    { name: 'wood',    question: 'made of wood?', group: 'look' },
    { name: 'broken',  question: 'broken?',       group: 'look' },
  ],

  // noun -> the art object it draws, and the kinds of thing it is
  nouns: {
    snaak: { gloss: 'snake', object: 'snake', kinds: ['animal', 'reptile'] },
    kat:   { gloss: 'cat',   object: 'cat', kinds: ['animal', 'paws'] },
    chaar: { gloss: 'chair', object: 'chair', kinds: ['object'] },
  },

  adjectives: {
    vennomus: { gloss: 'venomous', flag: 'venomous', nouns: ['snaak'], feature: 'venom', fits: 'reptile' },
    streept:  { gloss: 'striped',  flag: 'striped',  nouns: ['snaak', 'kat'], feature: 'stripes', fits: 'animal' },
    bootet:   { gloss: 'booted',   flag: 'booted',   nouns: ['kat'], feature: 'boots', fits: 'paws' },
    wudden:   { gloss: 'wooden',   flag: 'wooden',   nouns: ['chaar'], feature: 'wood', fits: 'object' },
    brooken:  { gloss: 'broken',   flag: 'broken',   nouns: ['chaar'], feature: 'broken', fits: 'object' },
  },
};
