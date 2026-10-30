/* lexicon.js : the new Wuggish, approved by Carlos on 2026-10-30 (SPEC.md).
 *
 * Eleven words for three things, a cat, a pony and a lizard: three plain
 * nouns, four nouns that name a thing with a look, and four adjectives.
 * Every word is a row of the nine yes-or-no `features`, in three groups:
 *   has     what a thing has (fur, hooves, scales): the queries are made of these
 *   goes    where a look goes (on a coat, on a body): the keys are made of these
 *   brings  what a look brings (stripes, spots, wings, horn): the values
 * WQ and WK give, for each feature that has one, its row of the weights: the
 * slot (1 or 2) it asks or answers in.  WV lists the features a value keeps.
 * `object` and `flags` are what js/art.js draws: the thing, and the looks a
 * noun wears from the start; an adjective's `flag` is the look it puts on.
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
    {"name": "fur", "question": "fur?", "group": "has"},
    {"name": "hooves", "question": "hooves?", "group": "has"},
    {"name": "scales", "question": "scales?", "group": "has"},
    {"name": "coat", "question": "goes on a coat?", "group": "goes"},
    {"name": "body", "question": "goes on a body?", "group": "goes"},
    {"name": "stripes", "question": "stripes?", "group": "brings"},
    {"name": "spots", "question": "spots?", "group": "brings"},
    {"name": "wings", "question": "wings?", "group": "brings"},
    {"name": "horn", "question": "a horn?", "group": "brings"}
  ],
  "slots": 2,
  "WQ": {"fur": [1, 0], "hooves": [0, 1], "scales": [0, 1]},
  "WK": {"coat": [1, 0], "body": [0, 1]},
  "WV": ["stripes", "spots", "wings", "horn"],
  "nouns": {
    "kat": {"gloss": "cat", "object": "cat", "flags": [], "features": ["fur"]},
    "poony": {"gloss": "pony", "object": "pony", "flags": [], "features": ["fur", "hooves"]},
    "lizzard": {"gloss": "lizard", "object": "lizard", "flags": [], "features": ["scales"]},
    "zeebra": {"gloss": "zebra", "object": "pony", "flags": ["striped"], "features": ["fur", "hooves", "stripes"]},
    "lepperd": {"gloss": "leopard", "object": "cat", "flags": ["spotted"], "features": ["fur", "spots"]},
    "draggon": {"gloss": "dragon", "object": "lizard", "flags": ["winged"], "features": ["scales", "wings"]},
    "unikorn": {"gloss": "unicorn", "object": "pony", "flags": ["horned"], "features": ["fur", "hooves", "horn"]}
  },
  "adjectives": {
    "streept": {"gloss": "striped", "flag": "striped", "features": ["coat", "stripes"]},
    "spottet": {"gloss": "spotted", "flag": "spotted", "features": ["coat", "spots"]},
    "winget": {"gloss": "winged", "flag": "winged", "features": ["body", "wings"]},
    "hornit": {"gloss": "horned", "flag": "horned", "features": ["body", "horn"]}
  }
};
