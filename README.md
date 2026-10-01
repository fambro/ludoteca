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
| `description` | Short description on the card |
| `image` | Local path to the cover image, e.g., `assets/covers/azul.webp`; `null` displays an illustrated cover |
| `website_url` | External link for the game |
| `owned_content` | Expansions, scenarios, and decks shown in the side panel |
| `version_of` | ID of the main entry when this is another edition of the same game |

Search ignores case and accents, combining all typed terms. Category and player count filters apply together with the search query. If you select 4 players, games whose range includes 4 will appear; games with an unknown player count are excluded from the filtered results.

Alternative editions stay in the JSON, but `version_of` links them to one visible card. The side panel lists the other editions, and search also matches their names and edition labels. Arkham Horror LCG and Arkham Horror LCG: Capitolo 2 remain separate entries.

## Sorting the catalog offline

Run `python3 scripts/sort_ludoteca.py` to sort `games` by title. The script uses only Python's standard library, ignores case, accents, and punctuation, and keeps alternative editions beside their main entry. Run `python3 scripts/sort_ludoteca.py --check` to verify the order without changing the file.
