"""Update SHA-256 cache versions for CSS, JavaScript, and catalog JSON.

Run after changing styles.css, script.js, or data/ludoteca.json:
    python3 scripts/update_asset_hashes.py

Use --check to verify references without writing files. Use --root _site to
version the files produced by the deployment build.
"""

import argparse
import hashlib
import json
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]


def sha256(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def update_reference(text: str, resource: str, digest: str) -> str:
    """Replace exactly one quoted URL, whether versioned or not."""
    pattern = re.compile(
        rf"(?P<quote>['\"]){re.escape(resource)}(?:\?v=[0-9a-f]{{64}})?(?P=quote)"
    )

    def replacement(match: re.Match[str]) -> str:
        quote = match.group("quote")
        return f"{quote}{resource}?v={digest}{quote}"

    updated, count = pattern.subn(replacement, text)
    if count != 1:
        raise ValueError(f"Expected one reference to {resource}, found {count}")
    return updated


def service_worker(root: Path, index: str, script: str, styles: bytes, data: bytes) -> str:
    """Precache one coherent build, including every cover, for offline use."""
    catalog = json.loads(data)
    covers = sorted({game["image"] for game in catalog["games"] if game.get("image")})
    icons = [f"assets/icons/icon-{size}.png" for size in (180, 192, 512)]
    extra_files = ["manifest.webmanifest", *icons, *covers]
    content = {
        "index.html": index.encode("utf-8"),
        "script.js": script.encode("utf-8"),
        "styles.css": styles,
        "data/ludoteca.json": data,
    }
    for name in extra_files:
        content[name] = (root / name).read_bytes()

    version = hashlib.sha256()
    for name in sorted(content):
        version.update(name.encode("utf-8"))
        version.update(hashlib.sha256(content[name]).digest())

    urls = [
        "./",
        f"script.js?v={sha256(content['script.js'])}",
        f"styles.css?v={sha256(styles)}",
        f"data/ludoteca.json?v={sha256(data)}",
        *extra_files,
    ]
    return (
        f"const CACHE_NAME = 'ludoteca-{version.hexdigest()[:16]}';\n"
        f"const PRECACHE_URLS = {json.dumps(urls, ensure_ascii=False, indent=2)};\n\n"
        "self.addEventListener('install', (event) => {\n"
        "  event.waitUntil(caches.open(CACHE_NAME).then((cache) =>\n"
        "    cache.addAll(PRECACHE_URLS.map((url) => new Request(new URL(url, self.registration.scope), { cache: 'reload' })))\n"
        "  ));\n"
        "});\n\n"
        "self.addEventListener('activate', (event) => {\n"
        "  event.waitUntil((async () => {\n"
        "    const names = await caches.keys();\n"
        "    await Promise.all(names.filter((name) => name.startsWith('ludoteca-') && name !== CACHE_NAME).map((name) => caches.delete(name)));\n"
        "    await self.clients.claim();\n"
        "  })());\n"
        "});\n\n"
        "self.addEventListener('fetch', (event) => {\n"
        "  if (event.request.method !== 'GET') return;\n"
        "  const url = new URL(event.request.url);\n"
        "  const scope = new URL(self.registration.scope);\n"
        "  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;\n"
        "  if (event.request.mode === 'navigate') {\n"
        "    event.respondWith(fetch(event.request, { cache: 'no-cache' }).catch(() => caches.match(new URL('./', scope))));\n"
        "    return;\n"
        "  }\n"
        "  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));\n"
        "});\n"
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Update SHA-256 resource URLs for browser caching.")
    parser.add_argument("--check", action="store_true", help="Check references without changing files")
    parser.add_argument("--root", type=Path, default=ROOT, help="Directory containing the site files")
    args = parser.parse_args()
    root = args.root.resolve()
    index = root / "index.html"
    script = root / "script.js"
    styles = root / "styles.css"
    data = root / "data" / "ludoteca.json"
    worker = root / "sw.js"

    original_script = script.read_text(encoding="utf-8")
    original_index = index.read_text(encoding="utf-8")

    data_bytes = data.read_bytes()
    styles_bytes = styles.read_bytes()
    data_hash = sha256(data_bytes)
    styles_hash = sha256(styles_bytes)
    updated_script = update_reference(original_script, "data/ludoteca.json", data_hash)
    script_hash = sha256(updated_script.encode("utf-8"))

    updated_index = update_reference(original_index, "data/ludoteca.json", data_hash)
    updated_index = update_reference(updated_index, "styles.css", styles_hash)
    updated_index = update_reference(updated_index, "script.js", script_hash)
    updated_worker = service_worker(root, updated_index, updated_script, styles_bytes, data_bytes)

    changed = []
    if updated_script != original_script:
        changed.append(script)
    if updated_index != original_index:
        changed.append(index)
    if not worker.exists() or updated_worker != worker.read_text(encoding="utf-8"):
        changed.append(worker)
    if args.check:
        if changed:
            print("Outdated references in: " + ", ".join(str(path.relative_to(root)) for path in changed))
            return 1
        print("Resource hashes are up to date")
        return 0

    if script in changed:
        script.write_text(updated_script, encoding="utf-8")
    if index in changed:
        index.write_text(updated_index, encoding="utf-8")
    if worker in changed:
        worker.write_text(updated_worker, encoding="utf-8")
    print("Updated: " + (", ".join(str(path.relative_to(root)) for path in changed) if changed else "nothing"))
    print(f"SHA-256: css={styles_hash[:12]}… js={script_hash[:12]}… json={data_hash[:12]}…")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
