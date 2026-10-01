# Ludoteca

Board game catalog.

## Local setup

From the project folder:

```sh
python3 -m http.server 8000
```

## Updating the catalog

Edit `data/ludoteca.json`. Each object in `games` has a unique `id`. The fields used by the page are:

| Field | Usage |
| --- | --- |
| `name` | Card title and search |
| `type` | Categories separated by `;`, used for chips, filters, and search |
| `publisher`, `authors` | Text search |
| `players` | Object `{ "min": 2, "max": 5 }`; `null` if unknown |
| `average_play_time_minutes` | Indicative base-game play time in minutes; `null` if a session has no reliable fixed length |
| `description` | Short description on the card |
| `image` | Local path to the cover image, e.g., `assets/covers/azul.webp`; `null` displays an illustrated cover |
| `website_url` | External link for the game |
| `manual_url` | Public rulebook link, preferably in Italian, otherwise in English; may lead to a rules page when no direct PDF is available; `null` when no matching manual was verified |
| `owned_content` | Expansions, scenarios, and decks shown in the side panel |
| `owned_content[].extends_player_count` | `true` when this content allows more players than the base game; otherwise `false` |
| `owned_content[].players_with_expansion` | Player range with that expansion, present when `extends_player_count` is `true` |
| `owned_content[].required_owned_products` | Names of additional games or content needed for the expanded player range; omitted when none are needed |
| `version_of` | ID of the main entry when this is another edition of the same game |

Search ignores case and accents, combining all typed terms. Category, player count, and maximum duration filters apply together with the search query. The player filter includes a game's base range and expanded ranges when all required products are recorded in the catalog. Games with no known usable range are excluded from player-filtered results. When a match comes only from an expansion, the card shows an additional player-count chip. The duration filter uses `average_play_time_minutes`; games with an unknown duration are excluded when a limit is selected.

Filters are stored in the URL as `q`, `category`, `players`, and `max_minutes`, for example `?players=4&max_minutes=90`. A shared link or page refresh restores the selected filters. Search typing updates the current history entry; select changes and clearing filters create entries so browser Back and Forward can restore them. Other URL parameters and fragments are preserved.

Play time is the midpoint of the published range, rounded to the nearest 5 minutes when needed. It is an estimate, not an average measured from plays. Available times appear as a compact chip on cards and in full in the side panel.

Alternative editions stay in the JSON, but `version_of` links them to one visible card. The side panel lists the other editions, and search also matches their names and edition labels. Arkham Horror LCG and Arkham Horror LCG: Capitolo 2 remain separate entries.

## Sorting the catalog offline

Run `python3 scripts/sort_ludoteca.py` to sort `games` by title. The script uses only Python's standard library, ignores case, accents, and punctuation, and keeps alternative editions beside their main entry. Run `python3 scripts/sort_ludoteca.py --check` to verify the order without changing the file.

## Browser cache versions

After editing `styles.css`, `script.js`, or `data/ludoteca.json`, run:

```sh
python3 scripts/update_asset_hashes.py
```

The offline script appends the full SHA-256 digest as `?v=` to the CSS, JavaScript, and JSON URLs. It updates the JSON URL in both `script.js` and the HTML preload, then hashes the updated JavaScript and writes its URL into `index.html`. Commit the changed files together. Use `python3 scripts/update_asset_hashes.py --check` to detect stale references without modifying files.

## GitHub Pages build

The deploy workflow runs `npm ci` and `npm run build`, then uploads only `_site/`. The build minifies CSS and JavaScript with esbuild, compacts the catalog JSON, and copies only the cover images referenced by it. It calculates SHA-256 versions from those final files. Source files are not changed by the build; `_site/` and `node_modules/` are ignored by Git.

To inspect the same output locally:

```sh
npm ci
npm run build
python3 -m http.server 8000 --directory _site
```
