# Ludoteca

Board game catalog.

## Local setup

From the project folder:

```sh
python3 -m http.server 8000

```

## Updating the catalog

Edit `data/ludoteca.json`. Each object in `giochi` has a unique `id`. The fields used by the page are:

| Field | Usage |
| --- | --- |
| `nome` | Card title and search |
| `tipologia` | Categories separated by `;`, used for chips, filters, and search |
| `casa_editrice`, `autori` | Text search |
| `giocatori` | Object `{ "min": 2, "max": 5 }`; `null` if unknown |
| `descrizione` | Short description on the card |
| `immagine` | Local path to the cover image, e.g., `assets/covers/azul.webp`; `null` displays an illustrated cover |
| `link_sito` | External link for the game |
| `versione_di` | ID of the main entry when this is another edition of the same game |

Search ignores case and accents, combining all typed terms. Category and player count filters apply together with the search query. If you select 4 players, games whose range includes 4 will appear; games with an unknown player count are excluded from the filtered results.

Alternative editions stay in the JSON, but `versione_di` links them to one visible card. The side panel lists the other editions, and search also matches their names and edition labels. Arkham Horror LCG and Arkham Horror LCG: Capitolo 2 remain separate entries.
