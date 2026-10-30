import type { Kind, Step } from '../types';
import { materials } from '../data/materials';
import { SEQUENCE_IS_DRAFT, sequence } from '../data/sequence';
import { MaterialRow } from '../components/MaterialRow';

/** The groups of "All materials", in this order, with a plural heading each. */
const GROUPS: { kind: Kind; heading: string }[] = [
  { kind: 'slides', heading: 'Slides' },
  { kind: 'viz', heading: 'Visualizations' },
  { kind: 'notes', heading: 'Notes' },
  { kind: 'notebook', heading: 'Notebooks' },
];

const catalogue: (Step & { id: string })[] = Object.entries(materials).map(([id, m]) => ({ id, ...m }));

function count(kind: Kind, one: string, many: string) {
  const n = catalogue.filter((m) => m.kind === kind).length;
  return `${n} ${n === 1 ? one : many}`;
}

export function HomePage() {
  // The steps are numbered across the blocks, so the number is a step's place in the sequence.
  let number = 0;
  return (
    <>
      <section className="hero" id="top">
        <div className="container">
          <div className="hero__inner">
            <p className="eyebrow">ETH Zürich · Advanced Machine Learning · Autumn semester 2026</p>
            <h1>Neural networks, language models and transformers</h1>
            <div className="hero__rule" />
            <p className="hero__lead">
              The slides, visualizations, notes and notebook of the lectures on neural networks, in
              the order we go through them: gradient descent with grasshoppers, ReLU networks that
              draw any piecewise-linear curve, language models, and attention. The visualizations run
              in your browser with nothing to install, and the notebook runs in Google Colab.
            </p>
            <dl className="hero__meta">
              <div>
                <dt>Course</dt>
                <dd>
                  Advanced Machine Learning, <span className="nowrap">252-0535-00L</span>
                </dd>
              </div>
              <div>
                <dt>Lectures</dt>
                <dd>From Monday 2 November 2026</dd>
              </div>
              <div>
                <dt>Material</dt>
                <dd>
                  {count('slides', 'deck', 'decks')} · {count('viz', 'visualization', 'visualizations')} ·{' '}
                  {count('notes', 'note', 'notes')} · {count('notebook', 'notebook', 'notebooks')}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="section" id="sequence">
        <div className="container">
          <div className="section__head">
            <h2>The sequence</h2>
            <p>
              Go through the material in this order. Each deck comes twice: Slides has a page for
              every click, as projected in the lecture, and Handout one page per slide. A
              visualization opens in a new tab.
            </p>
            {SEQUENCE_IS_DRAFT && (
              <p className="section__draft">This order is a draft and may still change.</p>
            )}
          </div>
          {sequence.map((block, b) => (
            <div className="block" key={b}>
              <div className="block__head">
                <h3>{block.title}</h3>
                {block.when && <span className="block__when">{block.when}</span>}
              </div>
              {block.summary && <p className="block__summary">{block.summary}</p>}
              <ol className="mlist">
                {block.steps.map((s, i) => (
                  <MaterialRow key={i} item={s} number={++number} />
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="materials">
        <div className="container">
          <div className="section__head">
            <h2>All materials</h2>
            <p>Everything on this site, grouped by kind.</p>
          </div>
          {GROUPS.map(({ kind, heading }) => {
            const items = catalogue.filter((m) => m.kind === kind);
            if (items.length === 0) return null;
            return (
              <div className="block" key={kind}>
                <div className="block__head">
                  <h3>{heading}</h3>
                </div>
                <ul className="mlist">
                  {items.map((m) => (
                    <MaterialRow key={m.id} item={m} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
