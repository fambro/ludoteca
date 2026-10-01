"""Update SHA-256 cache versions for CSS, JavaScript, and catalog JSON.

Run after changing styles.css, script.js, or data/ludoteca.json:
    python3 scripts/update_asset_hashes.py

Use --check to verify references without writing files. Use --root _site to
version the files produced by the deployment build.
"""

import argparse
import hashlib
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

    original_script = script.read_text(encoding="utf-8")
    original_index = index.read_text(encoding="utf-8")

    data_hash = sha256(data.read_bytes())
    styles_hash = sha256(styles.read_bytes())
    updated_script = update_reference(original_script, "data/ludoteca.json", data_hash)
    script_hash = sha256(updated_script.encode("utf-8"))

    updated_index = update_reference(original_index, "data/ludoteca.json", data_hash)
    updated_index = update_reference(updated_index, "styles.css", styles_hash)
    updated_index = update_reference(updated_index, "script.js", script_hash)

    changed = []
    if updated_script != original_script:
        changed.append(script)
    if updated_index != original_index:
        changed.append(index)
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
    print("Updated: " + (", ".join(str(path.relative_to(root)) for path in changed) if changed else "nothing"))
    print(f"SHA-256: css={styles_hash[:12]}… js={script_hash[:12]}… json={data_hash[:12]}…")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
