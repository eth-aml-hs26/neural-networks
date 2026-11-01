import type { Link, Step } from '../types';
import { SOON } from '../data/links';

/** Every link opens in a new tab; a notebook is saved instead (download). */
function linkProps(link: Link) {
  return {
    href: link.url,
    target: '_blank',
    rel: 'noopener noreferrer',
    ...(link.download ? { download: '' } : {}),
  };
}

/**
 * A topic with its formulas. The parts between $ signs are set as math, as LaTeX would: in a
 * serif face, single letters in italic (variables), a capitalised word upright (an operator
 * such as ReLU), digits, signs and brackets upright.
 */
const MATH_TOKEN = /([A-Z][A-Za-z]+)|([A-Za-zŷα-ω])|([^A-Za-zŷα-ω]+)/g;

export function Formula({ text }: { text: string }) {
  return (
    <>
      {text.split('$').map((piece, i) =>
        i % 2 === 1 ? (
          <span key={i} className="math">
            {Array.from(piece.matchAll(MATH_TOKEN), (m, j) => (m[2] ? <i key={j}>{m[2]}</i> : m[0]))}
          </span>
        ) : (
          piece
        ),
      )}
    </>
  );
}

/**
 * One row of a section: its number (e.g. 2.3, none in the introduction), the topic in bold,
 * the material below it, linked to its first link, and a button per link.
 */
export function MaterialRow({ item, number }: { item: Step; number?: string }) {
  const live = item.links.filter((l) => l.url !== SOON);
  const first = live[0];
  const soon = item.soon || live.length === 0;
  return (
    <li className={`row${soon ? ' row--soon' : ''}${number ? '' : ' row--plain'}`}>
      {number && <span className="row__num">{number}</span>}
      <div className="row__text">
        <span className="row__topic">
          <Formula text={item.topic} />
        </span>
        {first ? (
          <a className="row__title" {...linkProps(first)}>
            {item.title}
          </a>
        ) : (
          <span className="row__title">{item.title}</span>
        )}
      </div>
      <div className="row__links">
        {soon ? (
          <span className="row__link row__link--soon">soon</span>
        ) : (
          live.map((l, i) => (
            <a key={i} className="row__link" {...linkProps(l)}>
              {l.label}
              <span className="row__ext" aria-hidden="true">
                {l.download ? '↓' : '↗'}
              </span>
            </a>
          ))
        )}
      </div>
    </li>
  );
}
