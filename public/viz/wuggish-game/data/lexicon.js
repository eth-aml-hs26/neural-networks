/* lexicon.js : the Wuggish of 31 October 2026, a cat, a duck and a fish,
 * chosen by Carlos that day (SPEC.md).
 *
 * Eleven words for three things: three plain nouns (kat, dukk, feesh), four
 * nouns that name a thing with a look (runnerdukk, pussinbootz, pondukk,
 * flyfeesh), and four adjectives (runnin, bootet, swimmin, flyin).  Every
 * word is a row of the nine yes-or-no `features`, in three groups:
 *   has     what a thing has (legs, fins, wings): the queries are made of these
 *   goes    where a look goes (on the feet, into water or air): the keys
 *   brings  what a look brings (run, boots, water, air): the values
 * WQ and WK give, for each feature that has one, its row of the weights: the
 * slot (1 or 2) it asks or answers in.  WV lists the features a value keeps.
 * `object` and `flags` are what js/art.js draws: the thing, and the looks a
 * noun wears from the start; an adjective's `flag` is the look it puts on.
 * A rule the scores leave out, one place at a time (a thing runs, swims or
 * flies, at most one of them), lives in precompute/world.py as PLACES and in
 * js/art.js as ART.PLACE.
 *
 * This file is the one source of the language for the game (js/vectors.js,
 * js/game.js, js/reveal.js), the item bank (precompute/items.py), the check
 * (scripts/check-vectors.js) and the attention deck (docs/slides/attention/
 * figures.py).  Everything after the head line below is strict JSON, read
 * with json.loads in Python: double quotes, no comments and no trailing
 * commas inside it.  It is printed by
 *     python3 precompute/world.py --emit-lexicon
 * and checked by
 *     python3 precompute/world.py --lexicon data/lexicon.js
 * so change the world in world.py and SPEC.md first, with Carlos's yes, and
 * then paste the emitted object here below these comments.
 */
window.LEXICON = {
  "name": "Wuggish",
  "features": [
    {"name": "legs", "question": "legs?", "group": "has"},
    {"name": "fins", "question": "fins?", "group": "has"},
    {"name": "wings", "question": "wings?", "group": "has"},
    {"name": "feet", "question": "goes on the feet?", "group": "goes"},
    {"name": "fluid", "question": "goes into water or air?", "group": "goes"},
    {"name": "run", "question": "running?", "group": "brings"},
    {"name": "boots", "question": "boots?", "group": "brings"},
    {"name": "water", "question": "in water?", "group": "brings"},
    {"name": "air", "question": "in the air?", "group": "brings"}
  ],
  "slots": 2,
  "WQ": {"legs": [1, 0], "fins": [0, 1], "wings": [0, 1]},
  "WK": {"feet": [1, 0], "fluid": [0, 1]},
  "WV": ["run", "boots", "water", "air"],
  "nouns": {
    "kat": {"gloss": "cat", "object": "cat", "flags": [], "features": ["legs"]},
    "dukk": {"gloss": "duck", "object": "duck", "flags": [], "features": ["legs", "wings"]},
    "feesh": {"gloss": "fish", "object": "fish", "flags": [], "features": ["fins"]},
    "runnerdukk": {"gloss": "runner duck", "object": "duck", "flags": ["running"], "features": ["legs", "wings", "run"]},
    "pussinbootz": {"gloss": "Puss in Boots", "object": "cat", "flags": ["booted"], "features": ["legs", "boots"]},
    "pondukk": {"gloss": "pond duck", "object": "duck", "flags": ["swimming"], "features": ["legs", "wings", "water"]},
    "flyfeesh": {"gloss": "flying fish", "object": "fish", "flags": ["flying"], "features": ["fins", "air"]}
  },
  "adjectives": {
    "runnin": {"gloss": "running", "flag": "running", "features": ["feet", "run"]},
    "bootet": {"gloss": "booted", "flag": "booted", "features": ["feet", "boots"]},
    "swimmin": {"gloss": "swimming", "flag": "swimming", "features": ["fluid", "water"]},
    "flyin": {"gloss": "flying", "flag": "flying", "features": ["fluid", "air"]}
  }
};
