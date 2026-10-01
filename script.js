const dataUrl = new URL('data/ludoteca.json?v=e461d1f6970551a543b49f605cfada10605cb0e9ce626a972e42a91bd81ed4b5', document.baseURI);
const elements = {
  grid: document.querySelector('#game-grid'),
  search: document.querySelector('#search-input'),
  category: document.querySelector('#category-filter'),
  players: document.querySelector('#players-filter'),
  duration: document.querySelector('#duration-filter'),
  count: document.querySelector('#results-count'),
  clear: document.querySelector('#clear-filters'),
  empty: document.querySelector('#empty-state'),
  error: document.querySelector('#error-state'),
  drawer: document.querySelector('#game-drawer'),
  drawerClose: document.querySelector('#drawer-close'),
  drawerTitle: document.querySelector('#drawer-title'),
  drawerDescription: document.querySelector('#drawer-description'),
  drawerCategory: document.querySelector('#drawer-category'),
  drawerImage: document.querySelector('#drawer-image'),
  drawerImageFallback: document.querySelector('#drawer-image-fallback'),
  drawerPlayers: document.querySelector('#drawer-players'),
  drawerPlayTime: document.querySelector('#drawer-play-time'),
  drawerPublisher: document.querySelector('#drawer-publisher'),
  drawerAuthors: document.querySelector('#drawer-authors'),
  drawerEditionRow: document.querySelector('#drawer-edition-row'),
  drawerEdition: document.querySelector('#drawer-edition'),
  drawerVersions: document.querySelector('#drawer-versions'),
  drawerVersionsCount: document.querySelector('#drawer-versions-count'),
  drawerVersionsList: document.querySelector('#drawer-versions-list'),
  drawerContentsCount: document.querySelector('#drawer-contents-count'),
  drawerContentsList: document.querySelector('#drawer-contents-list'),
  drawerContentsEmpty: document.querySelector('#drawer-contents-empty'),
  drawerSiteLink: document.querySelector('#drawer-site-link'),
};

let games = [];
let drawerTrigger = null;
let drawerClosing = false;
let closeTimer = null;
let openingFrame = null;
const collator = new Intl.Collator('it', { sensitivity: 'base' });
const normalize = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('it').trim();
const categoriesOf = (game) => String(game.type ?? '').split(';').map((part) => part.trim()).filter(Boolean);

function coverColors(game) {
  const type = normalize(game.type);
  if (type.includes('horror') || type.includes('investigativ')) return ['#263d47', '#f4d0a2', '✦'];
  if (type.includes('strategia') || type.includes('lavoratori')) return ['#375b50', '#f4dfa5', '◈'];
  if (type.includes('cooperativo')) return ['#596873', '#f5e1c2', '✳'];
  if (type.includes('party') || type.includes('narrazione')) return ['#db7658', '#fff2ca', '✽'];
  if (type.includes('carte')) return ['#b87655', '#fff0c8', '✧'];
  return ['#d2a85f', '#2b3d37', '✳'];
}

function playerLabel(players) {
  if (!players || !Number.isInteger(players.min) || !Number.isInteger(players.max)) return 'Giocatori da verificare';
  return players.min === players.max ? `${players.min} giocatore${players.min === 1 ? '' : 'i'}` : `${players.min}–${players.max} giocatori`;
}

function validPlayerRange(range) {
  return range && Number.isInteger(range.min) && Number.isInteger(range.max) && range.min > 0 && range.max >= range.min;
}

function includesPlayerCount(range, count) {
  return validPlayerRange(range) && count >= range.min && count <= range.max;
}

function contentCountLabel(count) {
  return `${count} ${count === 1 ? 'contenuto' : 'contenuti'}`;
}

function openDrawer(game, trigger) {
  if (elements.drawer.open) return;
  drawerClosing = false;
  drawerTrigger = trigger;
  const contents = Array.isArray(game.owned_content) ? game.owned_content : [];

  elements.drawerTitle.textContent = game.name;
  elements.drawerDescription.textContent = game.description || 'Un gioco della collezione da scoprire insieme.';
  elements.drawerCategory.textContent = categoriesOf(game).join(' · ') || 'Gioco da tavolo';
  elements.drawerPlayers.textContent = playerLabel(game.players);
  elements.drawerPlayTime.textContent = Number.isInteger(game.average_play_time_minutes)
    ? `circa ${game.average_play_time_minutes} min`
    : 'Da verificare';
  elements.drawerPublisher.textContent = game.publisher || 'Da verificare';
  elements.drawerAuthors.textContent = Array.isArray(game.authors) && game.authors.length ? game.authors.join(', ') : 'Da verificare';
  elements.drawerEditionRow.hidden = !game.edition;
  elements.drawerEdition.textContent = game.edition || '';

  elements.drawerImage.hidden = !game.image;
  elements.drawerImageFallback.hidden = Boolean(game.image);
  elements.drawerImageFallback.textContent = game.name;
  if (game.image) {
    elements.drawerImage.alt = `Copertina di ${game.name}`;
    elements.drawerImage.src = game.image;
  } else {
    elements.drawerImage.removeAttribute('src');
  }

  const versions = game.otherVersions || [];
  elements.drawerVersions.hidden = versions.length === 0;
  elements.drawerVersionsCount.textContent = `${versions.length} ${versions.length === 1 ? 'versione' : 'versioni'}`;
  elements.drawerVersionsList.replaceChildren(...versions.map((version) => {
    const item = document.createElement('li');
    item.className = 'drawer-version-item';
    const cover = document.createElement('div');
    cover.className = 'drawer-version-cover';
    if (version.image) {
      const image = document.createElement('img');
      image.src = version.image;
      image.alt = '';
      image.loading = 'lazy';
      cover.append(image);
    }
    const information = document.createElement('div');
    information.className = 'drawer-version-info';
    const edition = document.createElement('span');
    edition.textContent = version.edition || 'Altra edizione';
    const name = document.createElement('strong');
    name.textContent = version.name;
    information.append(edition, name);
    if (version.notes) {
      const note = document.createElement('p');
      note.textContent = version.notes;
      information.append(note);
    }
    item.append(cover, information);
    if (version.website_url) {
      const link = document.createElement('a');
      link.href = version.website_url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', `Apri la pagina di ${version.name}, ${version.edition || 'altra edizione'}, in una nuova scheda`);
      link.textContent = '↗';
      item.append(link);
    }
    return item;
  }));

  elements.drawerContentsCount.textContent = contentCountLabel(contents.length);
  elements.drawerContentsEmpty.hidden = contents.length > 0;
  const items = contents.map((content) => {
    const item = document.createElement('li');
    item.className = 'drawer-content-item';
    const information = document.createElement('div');
    const category = document.createElement('span');
    category.className = 'drawer-content-category';
    category.textContent = content.category || 'contenuto aggiuntivo';
    const name = document.createElement('strong');
    name.textContent = content.name;
    information.append(category, name);
    if (content.quantity > 1) {
      const quantity = document.createElement('span');
      quantity.className = 'drawer-content-quantity';
      quantity.textContent = `×${content.quantity}`;
      information.append(quantity);
    }
    if (content.extends_player_count && content.players_with_expansion) {
      const playerExtension = document.createElement('p');
      playerExtension.className = 'drawer-content-player-extension';
      playerExtension.textContent = `Modalità con espansione: ${playerLabel(content.players_with_expansion)}`;
      information.append(playerExtension);
    }
    if (content.notes) {
      const note = document.createElement('p');
      note.textContent = content.notes;
      information.append(note);
    }
    item.append(information);
    if (content.website_url) {
      const link = document.createElement('a');
      link.href = content.website_url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', `Apri la pagina di ${content.name} in una nuova scheda`);
      link.textContent = '↗';
      item.append(link);
    }
    return item;
  });
  elements.drawerContentsList.replaceChildren(...items);
  elements.drawerSiteLink.hidden = !game.website_url;
  if (game.website_url) elements.drawerSiteLink.href = game.website_url;

  elements.drawer.showModal();
  document.body.classList.add('drawer-open');
  elements.drawer.scrollTop = 0;
  elements.drawerClose.focus();
  void elements.drawer.offsetWidth;
  openingFrame = requestAnimationFrame(() => elements.drawer.classList.add('is-visible'));
}

function closeDrawer() {
  if (!elements.drawer.open || drawerClosing) return;
  drawerClosing = true;
  cancelAnimationFrame(openingFrame);
  elements.drawer.classList.remove('is-visible');
  const finish = () => {
    clearTimeout(closeTimer);
    elements.drawer.removeEventListener('transitionend', onTransitionEnd);
    if (!elements.drawer.open) return;
    elements.drawer.close();
    document.body.classList.remove('drawer-open');
    if (drawerTrigger?.isConnected) drawerTrigger.focus();
    drawerTrigger = null;
    drawerClosing = false;
  };
  const onTransitionEnd = (event) => {
    if (event.target === elements.drawer && event.propertyName === 'transform') finish();
  };
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    finish();
  } else {
    elements.drawer.addEventListener('transitionend', onTransitionEnd);
    closeTimer = setTimeout(finish, 350);
  }
}

function createGameCard(game, index) {
  const [background, foreground, symbol] = coverColors(game);
  const article = document.createElement('article');
  article.className = 'game-card';
  const openButton = document.createElement('button');
  openButton.className = 'card-open';
  openButton.type = 'button';
  openButton.setAttribute('aria-label', `Apri dettagli e contenuti posseduti di ${game.name}`);
  openButton.addEventListener('click', () => openDrawer(game, openButton));

  const cover = document.createElement('div');
  cover.className = 'game-cover';
  cover.style.setProperty('--cover-bg', background);
  cover.style.setProperty('--cover-fg', foreground);

  const fallback = document.createElement('div');
  fallback.className = 'cover-inner';
  const top = document.createElement('span');
  top.className = 'cover-top';
  top.textContent = `LA LUDOTECA / ${String(index + 1).padStart(2, '0')}`;
  const title = document.createElement('strong');
  title.className = `cover-title${game.name.length > 28 ? ' long' : ''}`;
  title.textContent = game.name;
  const bottom = document.createElement('span');
  bottom.className = 'cover-bottom';
  bottom.textContent = categoriesOf(game)[0] || 'Gioco da tavolo';
  fallback.append(top, title, bottom);
  const decoration = document.createElement('span');
  decoration.className = 'cover-decoration';
  decoration.setAttribute('aria-hidden', 'true');
  decoration.textContent = symbol;
  cover.append(decoration, fallback);

  if (game.image) {
    const image = document.createElement('img');
    image.className = 'cover-image';
    image.alt = `Copertina di ${game.name}`;
    image.loading = index < 4 ? 'eager' : 'lazy';
    image.decoding = 'async';
    image.src = game.image;
    image.addEventListener('load', () => { fallback.hidden = true; decoration.hidden = true; });
    image.addEventListener('error', () => { image.remove(); });
    cover.append(image);
  }

  const body = document.createElement('div');
  body.className = 'card-body';
  const category = document.createElement('span');
  category.className = 'card-topline';
  category.textContent = categoriesOf(game)[0] || 'Gioco da tavolo';
  const heading = document.createElement('h3');
  heading.className = 'card-title';
  heading.textContent = game.name;
  const description = document.createElement('p');
  description.className = 'card-description';
  description.textContent = game.description || 'Un gioco della collezione da scoprire insieme.';
  const meta = document.createElement('div');
  meta.className = 'card-meta';
  const players = document.createElement('span');
  players.className = 'tag tag-players';
  players.textContent = playerLabel(game.players);
  meta.append(players);
  const requestedPlayers = Number(elements.players.value);
  if (requestedPlayers && !includesPlayerCount(game.players, requestedPlayers)) {
    const matchingExpansion = game._playerRanges.find(({ expansion, players: range }) => expansion && includesPlayerCount(range, requestedPlayers));
    if (matchingExpansion) {
      const expansionPlayers = document.createElement('span');
      expansionPlayers.className = 'tag tag-expansion-players';
      expansionPlayers.textContent = `fino a ${matchingExpansion.players.max} con esp.`;
      meta.append(expansionPlayers);
    }
  }
  if (Number.isInteger(game.average_play_time_minutes) && game.average_play_time_minutes > 0) {
    const playTime = document.createElement('span');
    playTime.className = 'tag tag-play-time';
    playTime.textContent = `≈ ${game.average_play_time_minutes} min`;
    meta.append(playTime);
  }
  categoriesOf(game).slice(0, 2).forEach((value) => {
    const chip = document.createElement('span');
    chip.className = 'tag';
    chip.textContent = value;
    meta.append(chip);
  });
  body.append(category, heading, description, meta);
  const detailHint = document.createElement('span');
  detailHint.className = 'card-detail-hint';
  const contentCount = Array.isArray(game.owned_content) ? game.owned_content.length : 0;
  const details = [];
  if (game.otherVersions?.length) details.push(`${game.otherVersions.length + 1} versioni`);
  if (contentCount) details.push(contentCountLabel(contentCount));
  detailHint.textContent = `${details.length ? `Dettagli · ${details.join(' · ')}` : 'Apri dettagli'} ↗`;
  body.append(detailHint);
  article.append(openButton, cover, body);
  return article;
}

function searchText(game) {
  const versions = [game, ...(game.otherVersions || [])];
  return normalize(versions.flatMap((version) => [version.name, version.title_in_list, version.edition, version.type, version.publisher, ...(version.authors || [])]).join(' '));
}

function writeFiltersToUrl(replace = false) {
  const url = new URL(window.location.href);
  const values = {
    q: elements.search.value.trim(),
    category: elements.category.value,
    players: elements.players.value,
    max_minutes: elements.duration.value,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  }
  if (url.href !== window.location.href) {
    window.history[replace ? 'replaceState' : 'pushState'](null, '', `${url.pathname}${url.search}${url.hash}`);
  }
}

function readFiltersFromUrl() {
  const params = new URL(window.location.href).searchParams;
  elements.search.value = params.get('q') || '';
  for (const [element, key] of [[elements.category, 'category'], [elements.players, 'players'], [elements.duration, 'max_minutes']]) {
    const requested = params.get(key) || '';
    element.value = [...element.options].some((option) => option.value === requested) ? requested : '';
  }
}

function render() {
  const terms = normalize(elements.search.value).split(/\s+/).filter(Boolean);
  const category = elements.category.value;
  const players = Number(elements.players.value);
  const maxMinutes = Number(elements.duration.value);
  const selected = games.filter((game) => {
    if (terms.length && !terms.every((term) => game._search.includes(term))) return false;
    if (category && !categoriesOf(game).includes(category)) return false;
    if (players && !game._playerRanges.some(({ players: range }) => includesPlayerCount(range, players))) return false;
    if (maxMinutes && (!Number.isInteger(game.average_play_time_minutes) || game.average_play_time_minutes > maxMinutes)) return false;
    return true;
  });

  elements.grid.replaceChildren(...selected.map(createGameCard));
  elements.count.innerHTML = `<strong>${selected.length}</strong> ${selected.length === 1 ? 'gioco trovato' : 'giochi trovati'}`;
  elements.empty.hidden = selected.length !== 0;
  elements.clear.hidden = !terms.length && !category && !players && !maxMinutes;
}

function applyFilterChange(replace = false) {
  writeFiltersToUrl(replace);
  render();
}

function resetFilters() {
  elements.search.value = '';
  elements.category.value = '';
  elements.players.value = '';
  elements.duration.value = '';
  applyFilterChange();
  elements.search.focus();
}

async function loadGames() {
  elements.error.hidden = true;
  try {
    const response = await fetch(dataUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.games)) throw new Error('Formato dati non valido');
    const allGames = data.games.map((game) => ({ ...game, otherVersions: [] }));
    const byId = new Map(allGames.map((game) => [game.id, game]));
    if (byId.size !== allGames.length) throw new Error('ID dei giochi duplicati');
    for (const game of allGames) {
      if (!game.version_of) continue;
      const primary = byId.get(game.version_of);
      if (!primary || primary.version_of) throw new Error(`Versione principale non valida: ${game.version_of}`);
      primary.otherVersions.push(game);
    }
    games = allGames.filter((game) => !game.version_of);
    const ownedProducts = new Set(allGames.flatMap((game) => [game.name, ...(game.owned_content || []).map((content) => content.name)]).map(normalize));
    games.forEach((game) => {
      game._search = searchText(game);
      game._playerRanges = [];
      if (validPlayerRange(game.players)) game._playerRanges.push({ players: game.players, expansion: null });
      for (const content of game.owned_content || []) {
        if (!content.extends_player_count || !validPlayerRange(content.players_with_expansion)) continue;
        if (!(content.required_owned_products || []).every((name) => ownedProducts.has(normalize(name)))) continue;
        game._playerRanges.push({ players: content.players_with_expansion, expansion: content });
      }
    });
    const categories = [...new Set(games.flatMap(categoriesOf))].sort(collator.compare);
    elements.category.replaceChildren(new Option('Tutte le categorie', ''), ...categories.map((value) => new Option(value[0].toUpperCase() + value.slice(1), value)));
    const playerCounts = [...new Set(games.flatMap((game) => game._playerRanges.flatMap(({ players: range }) => Array.from({ length: range.max - range.min + 1 }, (_, index) => range.min + index))))].sort((a, b) => a - b);
    elements.players.replaceChildren(new Option('N° giocatori', ''), ...playerCounts.map((count) => new Option(`${count} ${count === 1 ? 'giocatore' : 'giocatori'}`, String(count))));
    const durationLimits = [30, 45, 60, 90, 120, 180];
    const longestGame = Math.max(0, ...games.map((game) => game.average_play_time_minutes || 0));
    while (durationLimits.at(-1) < longestGame) durationLimits.push(durationLimits.at(-1) + 60);
    elements.duration.replaceChildren(new Option('Durata max', ''), ...durationLimits.map((minutes) => new Option(`Fino a ${minutes} min`, String(minutes))));
    readFiltersFromUrl();
    writeFiltersToUrl(true);
    render();
  } catch (error) {
    console.error('Errore nel caricamento della ludoteca:', error);
    elements.grid.replaceChildren();
    elements.count.textContent = '';
    elements.error.hidden = false;
  }
}

elements.search.addEventListener('input', () => applyFilterChange(true));
elements.category.addEventListener('change', () => applyFilterChange());
elements.players.addEventListener('change', () => applyFilterChange());
elements.duration.addEventListener('change', () => applyFilterChange());
window.addEventListener('popstate', () => {
  if (!games.length) return;
  readFiltersFromUrl();
  render();
});
elements.clear.addEventListener('click', resetFilters);
document.querySelector('#empty-reset').addEventListener('click', resetFilters);
document.querySelector('#retry-button').addEventListener('click', loadGames);
elements.drawerClose.addEventListener('click', closeDrawer);
elements.drawer.addEventListener('cancel', (event) => {
  event.preventDefault();
  closeDrawer();
});
elements.drawer.addEventListener('click', (event) => {
  if (event.target === elements.drawer && event.clientX < elements.drawer.getBoundingClientRect().left) closeDrawer();
});
elements.drawerImage.addEventListener('error', () => {
  elements.drawerImage.hidden = true;
  elements.drawerImageFallback.hidden = false;
});
loadGames();
