#!/usr/bin/env python3
"""Build an offline, single-file copy of the ABC Contact Center 360 mockup.

Reads call-center-mockup/index.html, swaps the Google Fonts <link> tags for
@font-face rules with the woff2 files embedded as base64, wraps the page in a
full HTML document and zips it with the README.

Usage: python3 offline/build.py   (from the repo root)
"""
import base64
import pathlib
import re
import urllib.request
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "call-center-mockup" / "index.html"
OUT_DIR = ROOT / "offline"
FONT_DIR = OUT_DIR / "fonts"
OUT_HTML = OUT_DIR / "ABC-Contact-Center-360.html"
README = OUT_DIR / "README.txt"
OUT_ZIP = OUT_DIR / "ABC-Contact-Center-360-offline.zip"

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0 Safari/537.36")
KEEP_SUBSETS = {"thai", "latin"}

# Reset that the Artifact platform normally injects around the page.
BASE_CSS = """html{color-scheme:light}
body{margin:0;font:14px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
img{max-width:100%}
[hidden]{display:none!important}"""


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def font_faces(css_url):
    """Return @font-face rules for the kept subsets, fonts inlined."""
    css = fetch(css_url).decode("utf-8")
    FONT_DIR.mkdir(parents=True, exist_ok=True)
    groups = {}  # one rule per distinct file; variable fonts share a file across weights
    for subset, block in re.findall(r"/\*\s*([\w-]+)\s*\*/\s*(@font-face\s*{[^}]*})", css):
        if subset not in KEEP_SUBSETS:
            continue
        url = re.search(r"url\((https://[^)]+\.woff2)\)", block).group(1)
        weight = int(re.search(r"font-weight:\s*(\d+)", block).group(1))
        groups.setdefault(url, [block, []])[1].append(weight)
    rules = []
    for url, (block, weights) in groups.items():
        family = re.search(r"font-family:\s*'([^']+)'", block).group(1)
        subset = "thai" if "U+0E" in block else "latin"
        path = FONT_DIR / f"{family.replace(' ', '')}-{min(weights)}-{subset}.woff2"
        if not path.exists():
            path.write_bytes(fetch(url))
        data = base64.b64encode(path.read_bytes()).decode("ascii")
        block = re.sub(r"font-weight:\s*\d+", f"font-weight: {min(weights)} {max(weights)}", block)
        rules.append(block.replace(url, f"data:font/woff2;base64,{data}"))
    return "\n".join(rules)


def main():
    page = SRC.read_text(encoding="utf-8")
    link = re.search(r'<link rel="stylesheet" href="(https://fonts\.googleapis\.com/[^"]+)">', page)
    css_url = link.group(1).replace("&amp;", "&")
    faces = font_faces(css_url)

    body = re.sub(r'<link rel="(?:preconnect|stylesheet)"[^>]*>\n?', "", page)
    title = re.search(r"<title>.*?</title>\n?", body).group(0)
    body = body.replace(title, "", 1)

    html = (
        '<!doctype html>\n<html lang="th">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
        f"{title.strip()}\n<style>\n{BASE_CSS}\n{faces}\n</style>\n</head>\n<body>\n"
        f"{body}\n</body>\n</html>\n"
    )
    OUT_HTML.write_text(html, encoding="utf-8")

    with zipfile.ZipFile(OUT_ZIP, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(OUT_HTML, OUT_HTML.name)
        z.write(README, README.name)

    print(f"{OUT_HTML.name}: {OUT_HTML.stat().st_size / 1024:.0f} KB, "
          f"{faces.count('@font-face')} font faces")
    print(f"{OUT_ZIP.name}: {OUT_ZIP.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
