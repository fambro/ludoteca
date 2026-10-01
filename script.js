const dataUrl = new URL('data/ludoteca.json', document.baseURI);
const elements = {
  grid: document.querySelector('#game-grid'),
  search: document.querySelector('#search-input'),
  category: document.querySelector('#category-filter'),
  players: document.querySelector('#players-filter'),
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
const categoriesOf = (game) => String(game.tipologia ?? '').split(';').map((part) => part.trim()).filter(Boolean);

function coverColors(game) {
  const type = normalize(game.tipologia);
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

function contentCountLabel(count) {
  return `${count} ${count === 1 ? 'contenuto' : 'contenuti'}`;
}

function openDrawer(game, trigger) {
  if (elements.drawer.open) return;
  drawerClosing = false;
  drawerTrigger = trigger;
  const contents = Array.isArray(game.contenuti_posseduti) ? game.contenuti_posseduti : [];

  elements.drawerTitle.textContent = game.nome;
  elements.drawerDescription.textContent = game.descrizione || 'Un gioco della collezione da scoprire insieme.';
  elements.drawerCategory.textContent = categoriesOf(game).join(' · ') || 'Gioco da tavolo';
  elements.drawerPlayers.textContent = playerLabel(game.giocatori);
  elements.drawerPublisher.textContent = game.casa_editrice || 'Da verificare';
  elements.drawerAuthors.textContent = Array.isArray(game.autori) && game.autori.length ? game.autori.join(', ') : 'Da verificare';
  elements.drawerEditionRow.hidden = !game.edizione;
  elements.drawerEdition.textContent = game.edizione || '';

  elements.drawerImage.hidden = !game.immagine;
  elements.drawerImageFallback.hidden = Boolean(game.immagine);
  elements.drawerImageFallback.textContent = game.nome;
  if (game.immagine) {
    elements.drawerImage.alt = `Copertina di ${game.nome}`;
    elements.drawerImage.src = game.immagine;
  } else {
    elements.drawerImage.removeAttribute('src');
  }

  const versions = game.altre_versioni || [];
  elements.drawerVersions.hidden = versions.length === 0;
  elements.drawerVersionsCount.textContent = `${versions.length} ${versions.length === 1 ? 'versione' : 'versioni'}`;
  elements.drawerVersionsList.replaceChildren(...versions.map((version) => {
    const item = document.createElement('li');
    item.className = 'drawer-version-item';
    const cover = document.createElement('div');
    cover.className = 'drawer-version-cover';
    if (version.immagine) {
      const image = document.createElement('img');
      image.src = version.immagine;
      image.alt = '';
      image.loading = 'lazy';
      cover.append(image);
    }
    const information = document.createElement('div');
    information.className = 'drawer-version-info';
    const edition = document.createElement('span');
    edition.textContent = version.edizione || 'Altra edizione';
    const name = document.createElement('strong');
    name.textContent = version.nome;
    information.append(edition, name);
    if (version.note) {
      const note = document.createElement('p');
      note.textContent = version.note;
      information.append(note);
    }
    item.append(cover, information);
    if (version.link_sito) {
      const link = document.createElement('a');
      link.href = version.link_sito;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', `Apri la pagina di ${version.nome}, ${version.edizione || 'altra edizione'}, in una nuova scheda`);
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
    category.textContent = content.categoria || 'contenuto aggiuntivo';
    const name = document.createElement('strong');
    name.textContent = content.nome;
    information.append(category, name);
    if (content.quantita > 1) {
      const quantity = document.createElement('span');
      quantity.className = 'drawer-content-quantity';
      quantity.textContent = `×${content.quantita}`;
      information.append(quantity);
    }
    if (content.note) {
      const note = document.createElement('p');
      note.textContent = content.note;
      information.append(note);
    }
    item.append(information);
    if (content.link_sito) {
      const link = document.createElement('a');
      link.href = content.link_sito;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', `Apri la pagina di ${content.nome} in una nuova scheda`);
      link.textContent = '↗';
      item.append(link);
    }
    return item;
  });
  elements.drawerContentsList.replaceChildren(...items);
  elements.drawerSiteLink.hidden = !game.link_sito;
  if (game.link_sito) elements.drawerSiteLink.href = game.link_sito;

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
  openButton.setAttribute('aria-label', `Apri dettagli e contenuti posseduti di ${game.nome}`);
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
  title.className = `cover-title${game.nome.length > 28 ? ' long' : ''}`;
  title.textContent = game.nome;
  const bottom = document.createElement('span');
  bottom.className = 'cover-bottom';
  bottom.textContent = categoriesOf(game)[0] || 'Gioco da tavolo';
  fallback.append(top, title, bottom);
  const decoration = document.createElement('span');
  decoration.className = 'cover-decoration';
  decoration.setAttribute('aria-hidden', 'true');
  decoration.textContent = symbol;
  cover.append(decoration, fallback);

  if (game.immagine) {
    const image = document.createElement('img');
    image.className = 'cover-image';
    image.alt = `Copertina di ${game.nome}`;
    image.loading = index < 4 ? 'eager' : 'lazy';
    image.decoding = 'async';
    image.src = game.immagine;
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
  heading.textContent = game.nome;
  const description = document.createElement('p');
  description.className = 'card-description';
  description.textContent = game.descrizione || 'Un gioco della collezione da scoprire insieme.';
  const meta = document.createElement('div');
  meta.className = 'card-meta';
  const players = document.createElement('span');
  players.className = 'tag tag-players';
  players.textContent = playerLabel(game.giocatori);
  meta.append(players);
  categoriesOf(game).slice(0, 2).forEach((value) => {
    const chip = document.createElement('span');
    chip.className = 'tag';
    chip.textContent = value;
    meta.append(chip);
  });
  body.append(category, heading, description, meta);
  const detailHint = document.createElement('span');
  detailHint.className = 'card-detail-hint';
  const contentCount = Array.isArray(game.contenuti_posseduti) ? game.contenuti_posseduti.length : 0;
  const details = [];
  if (game.altre_versioni?.length) details.push(`${game.altre_versioni.length + 1} versioni`);
  if (contentCount) details.push(contentCountLabel(contentCount));
  detailHint.textContent = `${details.length ? `Dettagli · ${details.join(' · ')}` : 'Apri dettagli'} ↗`;
  body.append(detailHint);
  article.append(openButton, cover, body);
  return article;
}

function searchText(game) {
  const versions = [game, ...(game.altre_versioni || [])];
  return normalize(versions.flatMap((version) => [version.nome, version.titolo_nella_lista, version.edizione, version.tipologia, version.casa_editrice, ...(version.autori || [])]).join(' '));
}

function render() {
  const terms = normalize(elements.search.value).split(/\s+/).filter(Boolean);
  const category = elements.category.value;
  const players = Number(elements.players.value);
  const selected = games.filter((game) => {
    if (terms.length && !terms.every((term) => game._search.includes(term))) return false;
    if (category && !categoriesOf(game).includes(category)) return false;
    if (players && (!game.giocatori || players < game.giocatori.min || players > game.giocatori.max)) return false;
    return true;
  });

  elements.grid.replaceChildren(...selected.map(createGameCard));
  elements.count.innerHTML = `<strong>${selected.length}</strong> ${selected.length === 1 ? 'gioco trovato' : 'giochi trovati'}`;
  elements.empty.hidden = selected.length !== 0;
  elements.clear.hidden = !terms.length && !category && !players;
}

function resetFilters() {
  elements.search.value = '';
  elements.category.value = '';
  elements.players.value = '';
  render();
  elements.search.focus();
}

async function loadGames() {
  elements.error.hidden = true;
  try {
    const response = await fetch(dataUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data.giochi)) throw new Error('Formato dati non valido');
    const allGames = data.giochi.map((game) => ({ ...game, altre_versioni: [] }));
    const byId = new Map(allGames.map((game) => [game.id, game]));
    if (byId.size !== allGames.length) throw new Error('ID dei giochi duplicati');
    for (const game of allGames) {
      if (!game.versione_di) continue;
      const primary = byId.get(game.versione_di);
      if (!primary || primary.versione_di) throw new Error(`Versione principale non valida: ${game.versione_di}`);
      primary.altre_versioni.push(game);
    }
    games = allGames.filter((game) => !game.versione_di);
    games.forEach((game) => { game._search = searchText(game); });
    const categories = [...new Set(games.flatMap(categoriesOf))].sort(collator.compare);
    elements.category.replaceChildren(new Option('Tutte le categorie', ''), ...categories.map((value) => new Option(value[0].toUpperCase() + value.slice(1), value)));
    const maximum = Math.max(0, ...games.map((game) => game.giocatori?.max || 0));
    elements.players.replaceChildren(new Option('N° giocatori', ''), ...Array.from({ length: maximum }, (_, index) => new Option(`${index + 1} ${index === 0 ? 'giocatore' : 'giocatori'}`, String(index + 1))));
    render();
  } catch (error) {
    console.error('Errore nel caricamento della ludoteca:', error);
    elements.grid.replaceChildren();
    elements.count.textContent = '';
    elements.error.hidden = false;
  }
}

elements.search.addEventListener('input', render);
elements.category.addEventListener('change', render);
elements.players.addEventListener('change', render);
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
