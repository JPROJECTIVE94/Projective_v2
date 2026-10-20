#!/usr/bin/env python3
"""Fail if pages reference different styles.css / script.js versions, or if styles.css / script.js
changed in this commit without a version bump. Run by .githooks/pre-commit."""
import re, subprocess, sys, glob
pages = sorted(glob.glob('*.html'))
errors = []
staged = subprocess.run(['git', 'diff', '--cached', '--name-only'], capture_output=True, text=True).stdout.split()
for kind in ('styles.css', 'script.js'):
    pat = re.compile(r'%s\?v=(\d+)' % re.escape(kind))
    found = {p: set(pat.findall(open(p).read())) for p in pages}
    versions = set().union(*found.values())
    if len(versions) > 1:
        errors.append('%s is referenced with mixed versions: %s' % (kind, {p: sorted(v) for p, v in found.items() if v}))
    if kind in staged:
        head = subprocess.run(['git', 'show', 'HEAD:index.html'], capture_output=True, text=True).stdout
        old = set(pat.findall(head))
        if old and old == versions:
            errors.append('%s changed but ?v= is still %s. Run: python3 tools/bump-version.py %s' % (kind, sorted(versions)[0], 'css' if kind == 'styles.css' else 'js'))
if errors:
    print('\n'.join('pre-commit: ' + e for e in errors)); sys.exit(1)
