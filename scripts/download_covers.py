"""Download and resize the product images listed in data/cover-sources.json.

Run from the repository root: python3 scripts/download_covers.py
Requires Pillow. Review image matches before publishing the catalog.
"""

from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
import json
from pathlib import Path
import sys
from urllib.request import Request, urlopen

from PIL import Image, ImageOps, UnidentifiedImageError


ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "data" / "cover-sources.json"
DATA = ROOT / "data" / "ludoteca.json"
DESTINATION = ROOT / "assets" / "covers"


def download(item):
    game_id, url = item
    path = DESTINATION / f"{game_id}.webp"
    try:
        request = Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; Ludoteca/1.0)"})
        with urlopen(request, timeout=25) as response:
            raw = response.read(15_000_001)
        if len(raw) > 15_000_000:
            raise ValueError("image exceeds 15 MB")
        with Image.open(BytesIO(raw)) as source:
            source.load()
            if source.width < 150 or source.height < 150:
                raise ValueError(f"image too small ({source.width}×{source.height})")
            image = ImageOps.exif_transpose(source).convert("RGBA")
            image.thumbnail((760, 640), Image.Resampling.LANCZOS)
            canvas = Image.new("RGBA", (800, 680), "#f1eee7")
            canvas.alpha_composite(image, ((800 - image.width) // 2, (680 - image.height) // 2))
            canvas.convert("RGB").save(path, "WEBP", quality=82, method=6)
        return game_id, None
    except (OSError, ValueError, UnidentifiedImageError) as error:
        return game_id, str(error)


def main():
    sources = json.loads(SOURCES.read_text())
    data = json.loads(DATA.read_text())
    ids = {game["id"] for game in data["giochi"]}
    if set(sources) != ids:
        raise ValueError(f"Source IDs differ from game IDs: {set(sources) ^ ids}")
    requested = set(sys.argv[1:]) or ids
    if not requested <= ids:
        raise ValueError(f"Unknown game IDs: {requested - ids}")
    DESTINATION.mkdir(parents=True, exist_ok=True)
    with ThreadPoolExecutor(max_workers=5) as pool:
        results = list(pool.map(download, ((game_id, url) for game_id, url in sources.items() if game_id in requested)))
    success = {game_id for game_id, error in results if error is None}
    for game_id, error in results:
        if error:
            print(f"FAILED {game_id}: {error}")
        else:
            print(f"OK {game_id}")
    for game in data["giochi"]:
        if game["id"] in requested:
            game["immagine"] = f"assets/covers/{game['id']}.webp" if game["id"] in success else None
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    print(f"Downloaded {len(success)}/{len(requested)} covers")


if __name__ == "__main__":
    main()
