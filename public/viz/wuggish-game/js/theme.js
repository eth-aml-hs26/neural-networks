/* theme.js : light/dark toggle on <html data-theme>, remembered in
 * localStorage, toggled with the 't' key.  Light is the lecture default.
 *
 * For headless screenshots a hash of #theme=dark or #theme=light forces the
 * theme and skips storage, so the same file can be rendered both ways.
 */
(function () {
  'use strict';
  const KEY = 'attention-game-theme';
  const root = document.documentElement;

  // ?theme=dark in the query, or #theme=dark in the hash (the contact sheet
  // has no query string; the game's hash is its route, so it uses the query)
  function forced() {
    const m = /theme=(dark|light)/.exec(location.search) || /theme=(dark|light)/.exec(location.hash);
    return m ? m[1] : null;
  }
  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function apply(theme) {
    root.setAttribute('data-theme', theme);
  }
  function set(theme) {
    apply(theme);
    try { localStorage.setItem(KEY, theme); } catch (e) { /* private mode, fine */ }
  }
  function toggle() {
    set(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  }

  apply(forced() || stored() || 'light');

  document.addEventListener('keydown', function (e) {
    if (e.key === 't' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      toggle();
    }
  });

  window.THEME = { set, toggle };
})();
