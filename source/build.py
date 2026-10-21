"""Build a self-contained static landing. No runtime, APIs, or dependencies."""
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent
html = (BASE / 'page.html').read_text()
prompt = (BASE / 'prompt.txt').read_text().rstrip('\n')
html = html.replace('/*__CSS__*/', (BASE / 'style.css').read_text())
html = html.replace('/*__JS__*/', (BASE / 'app.js').read_text())
html = html.replace('/*__PROMPT__*/', json.dumps(prompt, ensure_ascii=False).replace('<', '\\u003c'))
assert '/*__' not in html
site = BASE.parent
(site / 'index.html').write_text(html)
print(f'Built {site / "index.html"} ({len(html.encode())} bytes)')
