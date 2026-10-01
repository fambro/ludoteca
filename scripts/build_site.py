"""Build the small, self-contained directory uploaded to GitHub Pages."""

import json
from pathlib import Path
import shutil
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "_site"
ESBUILD = ROOT / "node_modules" / ".bin" / "esbuild"


def main() -> None:
    if not ESBUILD.is_file():
        raise SystemExit("esbuild is missing; run npm ci first")
    if OUTPUT.is_symlink():
        raise SystemExit("Refusing to replace a symlink at _site")

    catalog = json.loads((ROOT / "data" / "ludoteca.json").read_text(encoding="utf-8"))
    images = {game["image"] for game in catalog["games"] if game.get("image")}
    for image in images:
        path = Path(image)
        if path.is_absolute() or path.parts[:2] != ("assets", "covers") or ".." in path.parts:
            raise SystemExit(f"Invalid cover path: {image}")
        if not (ROOT / path).is_file():
            raise SystemExit(f"Missing cover: {image}")

    if OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    (OUTPUT / "data").mkdir(parents=True)
    shutil.copy2(ROOT / "index.html", OUTPUT / "index.html")
    (OUTPUT / "data" / "ludoteca.json").write_text(
        json.dumps(catalog, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )

    for image in sorted(images):
        destination = OUTPUT / image
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / image, destination)

    for name in ("script.js", "styles.css"):
        subprocess.run(
            [str(ESBUILD), str(ROOT / name), "--minify", f"--outfile={OUTPUT / name}"],
            check=True,
        )

    subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "update_asset_hashes.py"), "--root", str(OUTPUT)],
        check=True,
    )
    print(f"Built _site with {len(images)} covers")


if __name__ == "__main__":
    main()
