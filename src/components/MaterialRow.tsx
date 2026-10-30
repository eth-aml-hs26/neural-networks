import type { Kind, Link, Step } from '../types';
import { SOON } from '../data/links';

export const KIND_LABEL: Record<Kind | 'soon', string> = {
  slides: 'Slides',
  viz: 'Visualization',
  notes: 'Notes',
  notebook: 'Notebook',
  soon: 'Soon',
};

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
 * One row of the sequence (with its number) or of "All materials" (without): the title,
 * linked to the first link, the kind, the summary, the note of the step, and a button per link.
 */
export function MaterialRow({ item, number }: { item: Step; number?: number }) {
  const live = item.links.filter((l) => l.url !== SOON);
  const first = live[0];
  const soon = item.kind === 'soon' || live.length === 0;
  return (
    <li className={`mrow${soon ? ' mrow--soon' : ''}`}>
      {number !== undefined && <span className="mrow__num">{number}</span>}
      <div className="mrow__body">
        <div className="mrow__head">
          {first ? (
            <a className="mrow__title mrow__title--link" {...linkProps(first)}>
              {item.title}
            </a>
          ) : (
            <span className="mrow__title">{item.title}</span>
          )}
          <span className={`chip chip--${item.kind}`}>{KIND_LABEL[item.kind]}</span>
        </div>
        <p className="mrow__summary">{item.summary}</p>
        {item.note && <p className="mrow__note">{item.note}</p>}
        {item.links.length > 0 && (
          <div className="mrow__links">
            {item.links.map((l, i) =>
              l.url === SOON ? (
                <span key={i} className="mrow__link mrow__link--soon">
                  {l.label} · soon
                </span>
              ) : (
                <a key={i} className="mrow__link" {...linkProps(l)}>
                  {l.label}
                  <span className="mrow__ext" aria-hidden="true">
                    {l.download ? '↓' : '↗'}
                  </span>
                </a>
              ),
            )}
          </div>
        )}
      </div>
    </li>
  );
}
