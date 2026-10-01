#!/usr/bin/env python3
"""Build Starlight Voyager.

Concatenates src/js/*.js (in filename order) into src/shell.html and writes:
  index.html            standalone page (served by GitHub Pages / opened directly)
  dist/artifact.html    page body only, for publishing as a Claude artifact
  dist/test.html        standalone page without web fonts, for headless testing
"""
import glob, os, re

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
shell = open(os.path.join(root, 'src', 'shell.html')).read()
parts = []
for f in sorted(glob.glob(os.path.join(root, 'src', 'js', '*.js'))):
    parts.append('// ==== ' + os.path.basename(f) + ' ====\n' + open(f).read())
js = '\n'.join(parts)
assert '</script' not in js
body = shell.replace('<!--SCRIPT-->', '<script>\n(() => {\n' + js + '\n})();\n</script>')

HEAD = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">\n'
        '<meta name="theme-color" content="#04050c">\n'
        '<meta name="apple-mobile-web-app-capable" content="yes">\n'
        '<meta name="mobile-web-app-capable" content="yes">\n'
        '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n'
        '</head>\n<body>\n')
FOOT = '\n</body>\n</html>\n'

os.makedirs(os.path.join(root, 'dist'), exist_ok=True)
open(os.path.join(root, 'index.html'), 'w').write(HEAD + body + FOOT)
open(os.path.join(root, 'dist', 'artifact.html'), 'w').write(body)
test = re.sub(r'<link[^>]*fonts\.g[^>]*>\n?', '', body)
open(os.path.join(root, 'dist', 'test.html'), 'w').write(HEAD + test + FOOT)
print('built index.html:', len(HEAD + body + FOOT), 'bytes,', len(js.splitlines()), 'js lines')
