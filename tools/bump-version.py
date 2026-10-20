#!/usr/bin/env python3
"""Bump the cache-busting version on styles.css and script.js links across every page.

Usage: python3 tools/bump-version.py            # bump both
       python3 tools/bump-version.py css|js     # bump one
Browsers cache styles.css and script.js by URL, so a changed file must ship under a new ?v= value
on every page or returning visitors keep the old copy.
"""
import re, sys, glob
which = sys.argv[1] if len(sys.argv) > 1 else 'both'
pages = sorted(glob.glob('*.html'))
def bump(kind):
    pat = re.compile(r'(%s\?v=)(\d+)' % re.escape(kind))
    current = max(int(m.group(2)) for p in pages for m in pat.finditer(open(p).read()))
    nxt = current + 1
    for p in pages:
        s = open(p).read(); n = pat.sub(lambda m: m.group(1) + str(nxt), s)
        if n != s: open(p, 'w').write(n)
    print('%s -> v=%d on %d pages' % (kind, nxt, len(pages)))
if which in ('css', 'both'): bump('styles.css')
if which in ('js', 'both'): bump('script.js')
