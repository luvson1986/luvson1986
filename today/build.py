"""index.html + styles.css + data.js + app.js 를 하나의 HTML 파일로 묶어요.

    python3 build.py                 # dist/today.html (단독 실행 파일)
    python3 build.py --fragment OUT  # 문서 뼈대(doctype/html/head/body)를 뺀 조각 (Claude 아티팩트용)
"""
import pathlib
import re
import sys

here = pathlib.Path(__file__).parent


def bundle(page: str) -> str:
    html = (here / page).read_text(encoding="utf-8")

    def css(m):
        return "<style>\n" + (here / m.group(1)).read_text(encoding="utf-8") + "\n</style>"

    def js(m):
        return "<script>\n" + (here / m.group(1)).read_text(encoding="utf-8") + "\n</script>"

    html = re.sub(r'<link rel="stylesheet" href="([\w.-]+\.css)">', css, html)
    html = re.sub(r'<script src="([\w.-]+\.js)"></script>', js, html)
    return html


def fragment(html: str) -> str:
    drop = re.compile(r'^(<!doctype html>|<html[^>]*>|<head>|</head>|<body>|</body>|</html>|<meta charset[^>]*>|<meta name="viewport"[^>]*>|<link rel="(manifest|icon|apple-touch-icon)"[^>]*>|<meta name="(apple-mobile-web-app|mobile-web-app)[^>]*>)$')
    return "\n".join(l for l in html.splitlines() if not drop.match(l.strip()))


if __name__ == "__main__":
    page = "index.html"
    if "--page" in sys.argv:
        page = sys.argv[sys.argv.index("--page") + 1]
    out = bundle(page)
    if "--fragment" in sys.argv:
        pathlib.Path(sys.argv[sys.argv.index("--fragment") + 1]).write_text(fragment(out), encoding="utf-8")
    else:
        (here / "dist").mkdir(exist_ok=True)
        name = "today.html" if page == "index.html" else page
        (here / "dist" / name).write_text(out, encoding="utf-8")
