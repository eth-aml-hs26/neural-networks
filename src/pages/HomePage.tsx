import { useEffect } from 'react';
import type { Kind, Section, Step } from '../types';
import { sections } from '../data/sequence';
import { MaterialRow } from '../components/MaterialRow';

/**
 * Within a section, the rows of each kind form a group, in this order: visualizations first,
 * then slides (Carlos, 1 November 2026), then the notebook and the notes.
 */
const KIND_ORDER: { kind: Kind; one: string; many: string }[] = [
  { kind: 'viz', one: 'Visualization', many: 'Visualizations' },
  { kind: 'slides', one: 'Slides', many: 'Slides' },
  { kind: 'notebook', one: 'Notebook', many: 'Notebooks' },
  { kind: 'notes', one: 'Notes', many: 'Notes' },
];

/** The numbered sections get 1, 2, 3, ... in order; the introduction gets none. */
const numbers = new Map<Section, number>();
sections.filter((s) => s.numbered !== false).forEach((s, i) => numbers.set(s, i + 1));

function groups(section: Section) {
  return KIND_ORDER.map((k) => {
    const steps = section.steps.filter((s) => s.kind === k.kind);
    return { label: steps.length === 1 ? k.one : k.many, steps };
  }).filter((g) => g.steps.length > 0);
}

function SectionBlock({ section }: { section: Section }) {
  const n = numbers.get(section);
  // Rows are numbered n.1, n.2, ... in the order they are shown, across the groups.
  let row = 0;
  return (
    <section className="part" id={section.id}>
      <div className="container">
        <div className="part__head">
          {n !== undefined && <span className="part__num">{n}</span>}
          <h2>{section.title}</h2>
        </div>
        <p className="part__summary">{section.summary}</p>
        {groups(section).map((g) => (
          <div className="group" key={g.label}>
            <h3 className="group__label">{g.label}</h3>
            <ol className="rows">
              {g.steps.map((s: Step, i) => (
                <MaterialRow key={i} item={s} number={n === undefined ? undefined : `${n}.${++row}`} />
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomePage() {
  // A link such as .../#attention arrives before the sections exist; scroll once they do.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);
  return (
    <>
      <section className="title" id="top">
        <div className="container">
          <p className="eyebrow">
            Advanced Machine Learning <span className="nowrap">(252-0535-00L)</span> · ETH Zürich · Autumn semester 2026
          </p>
          <h1>Neural networks, language models and transformers</h1>
          <p className="title__lead">
            Lecture material in logical order. Within each section, visualizations come first, then slides.
          </p>
          <p className="title__legend">
            Slides: as projected, one page per click. Handout: one page per slide. Annotated: as
            written on in the lecture.
          </p>
          <nav className="toc" id="contents" aria-labelledby="toc-head">
            <h2 className="toc__head" id="toc-head">
              Contents
            </h2>
            <ol className="toc__list">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>
                    <span className="toc__num">{numbers.get(s) ?? ''}</span>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </section>
      {sections.map((s) => (
        <SectionBlock key={s.id} section={s} />
      ))}
    </>
  );
}
