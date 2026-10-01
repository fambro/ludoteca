"""Sort data/ludoteca.json alphabetically, without network access or dependencies.

Usage:
    python3 scripts/sort_ludoteca.py
    python3 scripts/sort_ludoteca.py --check
"""

import argparse
import json
from pathlib import Path
import unicodedata


DEFAULT_FILE = Path(__file__).resolve().parents[1] / "data" / "ludoteca.json"


def alphabetic_key(value: str) -> str:
    """Compare titles without case, accents, or punctuation."""
    decomposed = unicodedata.normalize("NFKD", value.casefold())
    letters = "".join(
        char for char in decomposed
        if not unicodedata.combining(char) and (char.isalnum() or char.isspace())
    )
    return " ".join(letters.split())


def sort_games(games: list[dict]) -> list[dict]:
    by_id = {game["id"]: game for game in games}
    if len(by_id) != len(games):
        raise ValueError("Il JSON contiene ID di gioco duplicati")

    def key(game: dict) -> tuple[str, int, str, str, str]:
        primary_id = game.get("versione_di")
        primary = by_id.get(primary_id) if primary_id else game
        if primary is None or primary.get("versione_di"):
            raise ValueError(f"Versione principale non valida per {game['id']}: {primary_id}")
        return (
            alphabetic_key(primary["nome"]),
            bool(primary_id),
            alphabetic_key(game["nome"]),
            alphabetic_key(game.get("edizione") or ""),
            game["id"],
        )

    return sorted(games, key=key)


def main() -> int:
    parser = argparse.ArgumentParser(description="Ordina alfabeticamente i giochi della ludoteca.")
    parser.add_argument("--file", type=Path, default=DEFAULT_FILE, help="File JSON da ordinare")
    parser.add_argument("--check", action="store_true", help="Controlla l'ordine senza modificare il file")
    args = parser.parse_args()

    with args.file.open(encoding="utf-8") as source:
        data = json.load(source)
    games = data.get("giochi")
    if not isinstance(games, list):
        raise ValueError("Il JSON deve contenere una lista 'giochi'")
    ordered = sort_games(games)
    if games == ordered:
        print(f"Già in ordine alfabetico: {len(games)} giochi")
        return 0
    if args.check:
        print(f"Da ordinare: {args.file}")
        return 1

    data["giochi"] = ordered
    args.file.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Ordinati {len(games)} giochi in {args.file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
