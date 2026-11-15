/* LF AgroTech — Mecanismo de pesquisa do Google Programmable Search Engine.
   Não é um backend. Resultados dependem da configuração e indexação do Google. */
(function () {
  'use strict';
  const CX = '54bdb979c687e49ab';
  const DOMAIN = {
    all: '',
    embrapa: 'site:embrapa.br',
    mapa: 'site:gov.br/agricultura',
    agrolink: 'site:agrolink.com.br',
    scielo: 'site:scielo.br'
  };
  const NAMES = { all: 'Todas as fontes', embrapa: 'Embrapa', mapa: 'MAPA', agrolink: 'AgroLink', scielo: 'SciELO' };
  const STORE_KEY = 'lf-agrotech-favoritos-v1';
  const $ = (selector) => document.querySelector(selector);
  const input = $('#searchInput');
  const results = $('#resultados');
  const status = $('#searchStatus');
  const summary = $('#querySummary');
  let queryText = '';
  let source = 'all';
  let currentSearchId = 0;
  let inMemoryFavorites = [];

  function getQuery() { return queryText + (DOMAIN[source] ? ' ' + DOMAIN[source] : ''); }
  function externalUrls() {
    const query = getQuery();
    $('#cseExternalLink').href = 'https://cse.google.com/cse?cx=' + encodeURIComponent(CX) + '&q=' + encodeURIComponent(query);
    const sites = source === 'all' ? '(site:embrapa.br OR site:gov.br/agricultura OR site:agrolink.com.br OR site:scielo.br)' : DOMAIN[source];
    $('#googleExternalLink').href = 'https://www.google.com/search?q=' + encodeURIComponent(queryText + ' ' + sites);
  }
  function elementForResults() {
    try {
      const api = window.google && window.google.search && window.google.search.cse && window.google.search.cse.element;
      if (!api) return null;
      const named = api.getElement('agroresults');
      if (named && typeof named.execute === 'function') return named;
      const all = api.getAllElements();
      for (const item of Object.values(all || {})) {
        if (item && typeof item.execute === 'function' && String(item.type || '').includes('searchresults')) return item;
      }
      return null;
    } catch (_) { return null; }
  }
  function executeSearch(id, attempt) {
    if (id !== currentSearchId) return;
    const element = elementForResults();
    if (element) {
      try {
        element.execute(getQuery());
        status.textContent = 'Consulta enviada. Os resultados aparecerão abaixo após o carregamento do Google.';
        return;
      } catch (error) { /* Acesso alternativo continua visível. */ }
    }
    if (attempt < 40) {
      window.setTimeout(() => executeSearch(id, attempt + 1), 250);
    } else {
      status.textContent = 'O componente de resultados não carregou. Utilize os links de pesquisa alternativa abaixo.';
    }
  }
  function navigate(id) {
    const target = document.getElementById(id);
    if (target && !target.hidden) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function setSource(next, rerun = true) {
    source = Object.hasOwn(DOMAIN, next) ? next : 'all';
    document.querySelectorAll('[data-source]').forEach((pill) => {
      const active = pill.dataset.source === source;
      pill.classList.toggle('is-selected', active);
      pill.setAttribute('aria-pressed', String(active));
    });
    if (queryText && rerun) search();
  }
  function setUrl() {
    const params = new URLSearchParams(window.location.search);
    if (queryText) params.set('q', queryText); else params.delete('q');
    if (source !== 'all') params.set('fonte', source); else params.delete('fonte');
    const suffix = params.toString();
    history.replaceState({}, '', window.location.pathname + (suffix ? '?' + suffix : '') + window.location.hash);
  }
  function search(shouldUpdateUrl = true) {
    queryText = input.value.trim();
    if (!queryText) { input.focus(); return; }
    results.hidden = false;
    summary.textContent = 'Pesquisa: ' + queryText + ' · ' + NAMES[source];
    status.textContent = 'Buscando publicações nas fontes selecionadas...';
    externalUrls();
    updateSaveButton();
    if (shouldUpdateUrl) setUrl();
    const id = ++currentSearchId;
    executeSearch(id, 0);
    navigate('resultados');
  }
  $('#searchForm').addEventListener('submit', (event) => { event.preventDefault(); search(); });
  document.querySelectorAll('[data-source]').forEach((pill) => pill.addEventListener('click', () => setSource(pill.dataset.source)));
  document.querySelectorAll('[data-explore]').forEach((button) => button.addEventListener('click', () => {
    setSource(button.dataset.explore, false);
    if (input.value.trim()) search();
    else { navigate('pesquisa'); input.focus({ preventScroll: true }); }
  }));

  function getFavorites() {
    try { const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); return Array.isArray(saved) ? saved : []; }
    catch (_) { return inMemoryFavorites; }
  }
  function putFavorites(items) {
    inMemoryFavorites = items;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(items)); }
    catch (_) { /* Armazenamento opcional. */ }
  }
  function updateSaveButton() {
    const btn = $('#saveQuery');
    const saved = !!queryText && getFavorites().some((item) => item.q === queryText && item.source === source);
    btn.classList.toggle('saved', saved);
    btn.querySelector('span').textContent = saved ? 'Pesquisa salva' : 'Salvar pesquisa';
    btn.setAttribute('aria-pressed', String(saved));
  }
  function saveFavorite() {
    if (!queryText) return;
    const favorites = getFavorites();
    const idx = favorites.findIndex((item) => item.q === queryText && item.source === source);
    if (idx >= 0) favorites.splice(idx, 1); else favorites.unshift({ q: queryText, source });
    putFavorites(favorites.slice(0, 30)); updateSaveButton(); renderFavorites();
  }
  function renderFavorites() {
    const list = $('#favoritesList'); list.replaceChildren();
    const favorites = getFavorites();
    if (!favorites.length) {
      const p = document.createElement('p'); p.className = 'favorite-empty'; p.textContent = 'Nenhuma pesquisa salva. Faça uma busca e clique em “Salvar pesquisa”.'; list.append(p); return;
    }
    favorites.forEach((favorite, index) => {
      const row = document.createElement('div'); row.className = 'favorite-row';
      const run = document.createElement('button'); run.type = 'button'; run.textContent = favorite.q + ' · ' + (NAMES[favorite.source] || NAMES.all);
      run.addEventListener('click', () => { input.value = favorite.q; setSource(favorite.source, false); search(); });
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'favorite-remove'; remove.textContent = 'Remover';
      remove.setAttribute('aria-label', 'Remover ' + favorite.q + ' dos favoritos');
      remove.addEventListener('click', () => { const arr = getFavorites(); arr.splice(index, 1); putFavorites(arr); renderFavorites(); updateSaveButton(); });
      row.append(run, remove); list.append(row);
    });
  }
  $('#saveQuery').addEventListener('click', saveFavorite);
  function selectNav(id) {
    document.querySelectorAll('.nav-link').forEach((link) => {
      const selected = link.dataset.nav === id;
      link.classList.toggle('is-active', selected);
      if (selected) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
  }
  document.querySelectorAll('.nav-link').forEach((link) => link.addEventListener('click', (event) => {
    const id = link.dataset.nav;
    if (id === 'favoritos') { event.preventDefault(); $('#favoritos').hidden = false; renderFavorites(); navigate('favoritos'); }
    else if (id === 'resultados' && results.hidden) { event.preventDefault(); navigate('pesquisa'); input.focus({ preventScroll: true }); }
    else if (id === 'pesquisa') { window.setTimeout(() => input.focus({ preventScroll: true }), 250); }
    selectNav(id);
    closeMobileMenu();
  }));
  $('#sidebarBackdrop').addEventListener('click', closeMobileMenu);
  $('#mobileMenuToggle').addEventListener('click', () => {
    const open = !$('#sidebar').classList.contains('is-open');
    $('#sidebar').classList.toggle('is-open', open);
    $('#sidebarBackdrop').hidden = !open;
    $('#mobileMenuToggle').setAttribute('aria-expanded', String(open));
  });
  function closeMobileMenu() {
    $('#sidebar').classList.remove('is-open');
    $('#sidebarBackdrop').hidden = true;
    $('#mobileMenuToggle').setAttribute('aria-expanded', 'false');
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMobileMenu(); });

  // Busca por URL (ex.: index.html?q=praga%20do%20milho&fonte=embrapa).
  const params = new URLSearchParams(location.search);
  const initial = params.get('q');
  const initialSource = params.get('fonte');
  if (initialSource && Object.hasOwn(DOMAIN, initialSource)) setSource(initialSource, false);
  if (initial) { input.value = initial; search(false); }
})();
