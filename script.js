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
};

let games = [];
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

function createGameCard(game, index) {
  const [background, foreground, symbol] = coverColors(game);
  const article = document.createElement('article');
  article.className = 'game-card';

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
  if (game.link_sito) {
    const link = document.createElement('a');
    link.className = 'card-link';
    link.href = game.link_sito;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Scopri il gioco';
    const arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';
    link.append(arrow);
    body.append(link);
  }
  article.append(cover, body);
  return article;
}

function searchText(game) {
  return normalize([game.nome, game.titolo_nella_lista, game.tipologia, game.casa_editrice, ...(game.autori || [])].join(' '));
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
    games = data.giochi.map((game) => ({ ...game, _search: searchText(game) }));
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
loadGames();
