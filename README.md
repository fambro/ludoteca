# La Ludoteca

Catalogo statico di giochi da tavolo. Funziona con HTML, CSS e JavaScript, senza backend o dipendenze da installare per la navigazione.

## Avvio locale

Dalla cartella del progetto:

```sh
python3 -m http.server 8000
```

Apri `http://localhost:8000`. Serve un server statico perché il browser carica `data/ludoteca.json` con `fetch`; aprire `index.html` direttamente dal filesystem può bloccare la richiesta.

## Aggiornare il catalogo

Modifica `data/ludoteca.json`. Ogni oggetto in `giochi` ha un `id` univoco. I campi usati dalla pagina sono:

| Campo | Uso |
| --- | --- |
| `nome` | Titolo della scheda e ricerca |
| `tipologia` | Categorie separate da `;`, usate per chip, filtro e ricerca |
| `casa_editrice`, `autori` | Ricerca testuale |
| `giocatori` | Oggetto `{ "min": 2, "max": 5 }`; `null` se sconosciuto |
| `descrizione` | Breve testo della scheda |
| `immagine` | Percorso locale della copertina, ad esempio `assets/covers/azul.webp`; `null` mostra una copertina illustrata |
| `link_sito` | Link esterno della scheda |

La ricerca ignora maiuscole e accenti e combina tutti i termini digitati. I filtri per categoria e numero di giocatori si applicano insieme alla ricerca. Se selezioni 4 giocatori, compaiono i giochi il cui intervallo include 4; i giochi con numero sconosciuto restano fuori dal risultato filtrato.

## Copertine

Le copertine sono file WebP locali in `assets/covers`, quindi il sito non richiede richieste a siti terzi durante la navigazione. Gli URL originali sono registrati in `data/cover-sources.json`.

Per sostituire una copertina, puoi inserire un nuovo file in `assets/covers` e aggiornare il relativo percorso `immagine` nel JSON. Per riscaricare una copertina dall'URL registrato:

```sh
python3 scripts/download_covers.py id-del-gioco
```

Lo script di manutenzione richiede Pillow (`pip install Pillow`). Senza argomenti aggiorna tutte le copertine. Dopo ogni download conviene controllare che la foto corrisponda all'edizione posseduta: per alcuni giochi l'edizione esatta non è ancora specificata nel catalogo.
