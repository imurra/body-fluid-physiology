"""Tally CHANGELOG.md rows by category and source."""
import collections, pathlib
rows = [l.split('|')[1:-1] for l in pathlib.Path(__file__).resolve().parents[1].joinpath('CHANGELOG.md').read_text().splitlines()
        if l.startswith('| 20')]
cat = collections.Counter(r[3].strip() for r in rows); src = collections.Counter(r[4].strip() for r in rows)
print(f'{len(rows)} changes logged (after the 81-change baseline)')
for name, c in (('By category', cat), ('By source', src)):
    print(name); [print(f'  {k:22s}{v:3d} ({v/len(rows):.0%})') for k, v in c.most_common()]
