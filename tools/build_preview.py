"""Build standalone preview pages from the mockup sources.

The mockup sources are written as artifact fragments (no <html>/<head>, fonts
from Google Fonts). This wraps each one in a full document with a viewport tag
and points the fonts at preview/fonts/, so the pages work from any static host
or straight from disk, on phones as well as desktops.

Usage: python3 tools/build_preview.py
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = {
    "line-oa-mockup/index.html": "preview/line-oa.html",
    "backoffice-mockup/index.html": "preview/backoffice.html",
}
HEAD = (
    '<!doctype html>\n<html lang="th">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
)


def standalone(src: str) -> str:
    s = re.sub(r'<link rel="preconnect"[^>]*>\n', "", src)
    s = re.sub(
        r'<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>',
        '<link rel="stylesheet" href="fonts/fonts.css">',
        s,
    )
    head_end = s.index("</style>") + len("</style>")
    s = HEAD + s[:head_end] + "\n</head>\n<body>\n" + s[head_end:] + "\n</body>\n</html>\n"
    s = s.replace("body { background: var(--page);", "body { margin: 0; background: var(--page);")
    if "fonts.googleapis.com" in s:
        raise SystemExit("Google Fonts link left in output")
    return s


for src, dst in PAGES.items():
    out = ROOT / dst
    out.write_text(standalone((ROOT / src).read_text(encoding="utf-8")), encoding="utf-8")
    print("wrote", out.relative_to(ROOT))
