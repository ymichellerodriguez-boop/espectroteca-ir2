"""Reconstruye glyph-templates.json a partir de tres tablas de picos transcritas y revisadas a mano.
Uso: python3 -I build_templates.py <carpeta word/media extraída del .docx>"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from peakocr import build_templates_v4

TRUTH = {
    'image109.gif': ["3091 42", "3072 49", "3036 27", "1961 77", "1815 70", "1526 81", "1479 20", "1393 84", "1176 86", "1038 49", "674 4"],  # benceno
    'image86.png': ["3347 8", "3336 8", "2945 16", "2833 22", "2522 77", "2046 84", "1450 47", "1116 62", "1030 4", "662 56"],  # metanol
    'image1.png': ["3623 62", "2934 4", "2858 23", "2665 86", "1466 77", "1453 43", "1365 72", "1347 79", "1254 77", "1230 77", "1160 84",
                   "1135 79", "1067 35", "1026 62", "971 63", "963 58", "889 72", "666 79"],  # ciclohexanol
}

if __name__ == '__main__':
    media = sys.argv[1]
    T = {}
    for f, truth in TRUTH.items():
        for k, v in build_templates_v4(os.path.join(media, f), truth).items():
            T.setdefault(k, []).extend(v)
    json.dump({k: [t.round(5).tolist() for t in v] for k, v in T.items()}, open(os.path.join(os.path.dirname(__file__), 'glyph-templates.json'), 'w'))
    print({k: len(v) for k, v in sorted(T.items())})
