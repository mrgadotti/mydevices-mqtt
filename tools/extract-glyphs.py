#!/usr/bin/env python3
"""Extracts color ramps and the icon-font glyph map from an apktool decode of a reference app.
Usage: extract-glyphs.py <decoded-dir> <out-dir> <color-prefix>   (writes palette.json, glyphIcons.json and copies icons.ttf)"""
import json, re, shutil, sys
src, out, prefix = sys.argv[1], sys.argv[2], sys.argv[3]
colors = open(f'{src}/res/values/colors.xml').read()
ramps = {}
for ramp, step, value in re.findall(r'name="' + prefix + r'_([a-z0-9]+)_(\d+)">(#[0-9a-fA-F]{6,8})<', colors):
    ramps.setdefault(ramp, {})[int(step)] = value.lower()
keep = ['brand', 'complimentary1', 'complimentary2', 'complimentary3', 'critical', 'positive', 'warning', 'neutral', 'primary', 'white']
palette = {r: [ramps[r][i] for i in sorted(ramps[r])] for r in keep if r in ramps}
json.dump(palette, open(f'{out}/palette.json', 'w'), indent=1)
strings = open(f'{src}/res/values/strings.xml', encoding='utf8').read()
icons = {n[5:]: f'{ord(v):04x}' for n, v in re.findall(r'<string name="(icon_[a-z0-9_]+)">(.)</string>', strings)}
json.dump(icons, open(f'{out}/glyphIcons.json', 'w'), indent=0)
shutil.copy(f'{src}/res/font/icons.ttf', f'{out}/glyph_icons.ttf')
print({k: len(v) for k, v in palette.items()}, len(icons), 'icons')
