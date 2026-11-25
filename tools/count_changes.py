"""Tally CHANGELOG.md rows by category and source. One row = one change;
a row tagged [n texts] edits the same kind of text in several places."""
import collections, pathlib, re
rows = [l.split('|')[1:-1] for l in pathlib.Path(__file__).resolve().parents[1].joinpath('CHANGELOG.md').read_text().splitlines()
        if l.startswith('| 20')]
cat = collections.Counter(r[3].strip() for r in rows); src = collections.Counter(r[4].strip() for r in rows)
texts = sum(int(m.group(1)) if (m := re.search(r'\[(\d+) texts\]', r[2])) else 1 for r in rows)
print(f'{len(rows)} changes logged after the 81-change baseline ({texts} individual texts or elements)')
for name, c in (('By category', cat), ('By source', src)):
    print(name); [print(f'  {k:22s}{v:3d} ({v/len(rows):.0%})') for k, v in c.most_common()]
