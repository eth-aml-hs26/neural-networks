import { EthLogo } from './EthLogo';
import { REPO } from '../data/links';

export function Header() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <a href="#top" className="brand">
          <EthLogo className="brand__eth" />
          <span className="brand__divider" />
          <span className="brand__course">Advanced Machine Learning</span>
        </a>
        <nav className="site-nav">
          <a href="#contents" className="site-nav__link">
            Contents
          </a>
          <a
            href={`https://github.com/${REPO}`}
            className="site-nav__link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Source
          </a>
        </nav>
      </div>
    </header>
  );
}
