#!/usr/bin/env python3
"""Build the file to publish: the page minus the host's own <html>/<body> wrapper.
Usage: python3 tools/make-publish.py [out]   (default out: /tmp/desk-publish.html)"""
import sys, pathlib
src = pathlib.Path(__file__).resolve().parent.parent / 'reach-theory-desk.html'
s = src.read_text(encoding='utf8')
a = s.index('<body>') + len('<body>'); b = s.rindex('</body></html>')
out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/desk-publish.html')
out.write_text(s[a:b].lstrip('\n'), encoding='utf8'); print('wrote', out)
