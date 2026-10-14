import json,sys
for r in json.load(sys.stdin):
  if r.get('missing'): print('---', r['selector'], 'MISSING'); continue
  a=r.get('after') or {}; b=r.get('before') or {}
  print('---', r['selector'], 'L', b.get('line'), b.get('tag'), '| hit', b.get('hit'), 'hitLine', b.get('hitLine'), '|', r.get('file'), r.get('sig'))
  print('   opened:', a.get('active'), a.get('label'), 'editingLine', a.get('editingLine'), 'caret', a.get('caret'), 'scrollY', b.get('sy'), '->', a.get('y'))
  print('   value:', repr(a.get('value'))[:220], '| status:', a.get('status'))
