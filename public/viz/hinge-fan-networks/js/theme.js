/* Theme toggle: light (the lecture default) and dark.
 * The choice is remembered in localStorage; ?theme=light|dark in the URL overrides it.
 * Keyboard shortcut: t. */
window.Theme = (function () {
  'use strict';
  var root = document.documentElement;
  var KEY = 'aml-hinge-fan-theme';

  function get() { return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }

  function set(t, remember) {
    root.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
    if (remember !== false) {
      try { localStorage.setItem(KEY, get()); } catch (e) { /* storage may be blocked */ }
    }
    window.dispatchEvent(new CustomEvent('theme-change', { detail: { theme: get() } }));
  }

  function toggle() { set(get() === 'dark' ? 'light' : 'dark'); }

  function init() {
    var fromUrl = new URLSearchParams(location.search).get('theme');
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) { /* ignore */ }
    if (fromUrl === 'light' || fromUrl === 'dark') set(fromUrl, false);
    else set(saved === 'dark' ? 'dark' : 'light', false);

    window.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t && (t.tagName === 'TEXTAREA' || (t.tagName === 'INPUT' && !/range|checkbox|button/.test(t.type)))) return;
      if (e.key === 't' || e.key === 'T') toggle();
    });
  }

  return { get: get, set: set, toggle: toggle, init: init };
})();
