#!/usr/bin/env python3
"""Turn a screenshot-style exam PDF into a draft source file for build-paper.mjs, using OCR
instead of having Claude look at every page (one image ~= 1.5k tokens; this file's text ~= 150).

  python3 scripts/ocr-paper.py "<paper>.pdf" -o draft.txt [--pages 1-49] [--id dsat24-10-us-b-rw]
  python3 scripts/ocr-paper.py "<paper>.pdf" --crop 37            # small PNG of page 37 for a visual check

Needs: poppler-utils (pdfimages), tesseract-ocr, Pillow. Better model (recommended):
  curl -sSL -o ~/.tess/eng.traineddata https://raw.githubusercontent.com/tesseract-ocr/tessdata_best/main/eng.traineddata
Full steps: /mnt/project-files/exam-2024/HOW-TO.md

What it does per page: takes the embedded screenshot, fades the light watermark away, finds the
Bluebook divider (passage left, question right), OCRs each side, reads "Section N, Module M" and
"Question N of 27", splits the answer boxes into A)-D) and writes the build-paper format.
Anything it is unsure of gets a line starting with "!!" (low OCR confidence, not 4 choices, a
figure/table, math symbols). build-paper.mjs refuses "!!" lines, so every flag must be resolved
(fix the text, or --crop that page and look) before building. Keys (K:) and explanations (E:)
are left for Claude to write.
"""
import argparse, os, re, subprocess, sys, tempfile
from PIL import Image

WATERMARK = re.compile(r'johann|ohanne|annes|hannes|johan|scoring|servic|highest|@jo', re.I)
CHROME_BITS = re.compile(r'^.{0,12}?mark\s*f\w*\s*re\w*\W*\d?\s*', re.I)
CHROME = re.compile(r'mark\s*for\s*rev|^directions|highlights|^more$|^hide$|question\s+\d+\s+of|^next$|^back$', re.I)
MATHY = re.compile(r'[=<>≤≥√π^°]|\d\s*/\s*\d|\b[xy]\s*\(|\bf\(')


def tessdir():
    for d in (os.environ.get('TESS_BEST'), os.path.expanduser('~/.tess')):
        if d and os.path.exists(os.path.join(d, 'eng.traineddata')):
            cfg = os.path.join(d, 'configs')
            if not os.path.exists(cfg):
                for sysd in ('/usr/share/tesseract-ocr/5/tessdata', '/usr/share/tesseract-ocr/4.00/tessdata'):
                    if os.path.exists(os.path.join(sysd, 'configs')):
                        os.symlink(os.path.join(sysd, 'configs'), cfg)
                        break
            return d
    return None


def ocr(img, tmp, psm=6, underlines=False, strict=True):
    """Returns lines: [{'x','y','h','words':[(x,text,conf)]}] for a PIL grayscale image."""
    p = os.path.join(tmp, 'o.png')
    img.save(p)
    cmd = ['tesseract', p, 'stdout', '--psm', str(psm)]
    td = tessdir()
    if td:
        cmd += ['--tessdata-dir', td]
    out = subprocess.run(cmd + ['tsv'], capture_output=True, text=True).stdout
    lines = {}
    for row in out.splitlines()[1:]:
        f = row.split('\t')
        if len(f) < 12 or not f[11].strip():
            continue
        conf = float(f[10])
        text = f[11].strip()
        if WATERMARK.search(text):
            continue
        alnum = sum(c.isalnum() for c in text)
        if conf < 25 and alnum < 2:
            continue
        if alnum == 0 and not re.fullmatch(r'[“”"\'’‘.,;:!?()\[\]—–\-=+<>≤≥√π/%$]+', text):
            continue
        key = (f[2], f[3], f[4])
        L = lines.setdefault(key, {'x': 10**9, 'y': int(f[7]), 'h': int(f[9]), 'words': []})
        L['x'] = min(L['x'], int(f[6]))
        L['h'] = max(L['h'], int(f[9]))
        L['words'].append((int(f[6]), text, conf, int(f[8])))
    res = []
    for L in sorted(lines.values(), key=lambda l: l['y']):
        # drop stray junk tokens: very low confidence non-word fragments at the line ends
        w = L['words']
        while w and w[0][2] < 40 and not re.search(r'[A-Za-z]{3}', w[0][1]):
            w.pop(0)
        while w and w[-1][2] < 40 and not re.search(r'[A-Za-z]{3}', w[-1][1]):
            w.pop()
        if not w:
            continue
        text = ' '.join(x[1] for x in w)
        conf = sum(x[2] for x in w) / len(w)
        good = sum(1 for x in w if x[2] >= 60 and re.search(r'[A-Za-z]{3}', x[1]))
        if strict and (conf < 50 or (good < 2 and conf < 70 and not re.search(r'\d', text))):
            continue  # watermark / border noise
        if sum(c.isalnum() for c in text) < 3 and not re.search(r'\d', text):
            continue
        L['x'] = w[0][0]
        L['text'] = text
        L['conf'] = sum(x[2] for x in w) / len(w)
        res.append(L)
    if underlines:
        mark_underlines(img, res)
    return res


def mark_underlines(img, lines):
    """Find dark rules just under a text line: wrap the words above them in <u>..</u>; a rule under no
    word is a fill-in blank and becomes ______."""
    px = img.load()
    W, H = img.size
    for L in lines:
        h = L['h']
        segs = []
        for y in range(L['y'] + int(h * 0.75), min(H, L['y'] + int(h * 1.6))):
            run = None
            for x in range(W):
                if px[x, y] < 170:
                    run = run if run is not None else x
                else:
                    if run is not None and x - run > h * 1.5:
                        segs.append((run, x))
                    run = None
        if not segs:
            continue
        segs.sort()
        merged = []
        for a, b in segs:
            if merged and a <= merged[-1][1] + 4:
                merged[-1][1] = max(merged[-1][1], b)
            else:
                merged.append([a, b])
        # a real rule is thin: ignore runs that are just the bottoms of letters (short) or full-width borders
        merged = [(a, b) for a, b in merged if b - a < W * 0.9]
        words = L['words']
        new, used = [], set()
        for a, b in merged:
            inside = [i for i, wd in enumerate(words) if wd[0] + wd[3] / 2 > a and wd[0] + wd[3] / 2 < b]
            if inside:
                used.update(inside)
                words[inside[0]] = (words[inside[0]][0], '<u>' + words[inside[0]][1], *words[inside[0]][2:])
                j = inside[-1]
                words[j] = (words[j][0], words[j][1] + '</u>', *words[j][2:])
            elif b - a > h * 2.5:
                new.append((a, '______', 99, b - a))
        if new:
            words.extend(new)
            words.sort(key=lambda wd: wd[0])
        L['text'] = ' '.join(wd[1] for wd in words)
        L['text'] = re.sub(r'<u>(\W*)', r'\1<u>', L['text'])


def prep(gray, scale, lo, hi):
    if sum(gray.resize((32, 8)).tobytes()) / 256 < 110:  # white text on a dark pill (Bluebook footer)
        gray = Image.eval(gray, lambda v: 255 - v)
    g = gray.resize((int(gray.width * scale), int(gray.height * scale)), Image.LANCZOS)
    return g.point(lambda v: 0 if v < lo else (255 if v > hi else int((v - lo) * 255 / (hi - lo))))


def find_divider(gray):
    """x of a long vertical line in the middle of the screen (Bluebook passage | question), or None."""
    w, h = gray.size
    y0, y1 = int(h * 0.12), int(h * 0.86)
    px = gray.load()
    ys = range(y0, y1, 2)
    frac = {x: sum(1 for y in ys if px[x, y] < 200) / len(ys) for x in range(int(w * 0.3), int(w * 0.7))}
    bx = max(frac, key=frac.get)
    side = [frac.get(bx + d, 1) for d in (-8, -6, 6, 8)]
    return bx if frac[bx] > 0.85 and min(side) < 0.6 else None


def paragraphs(lines):
    """Join OCR lines into paragraphs: a new one starts after a vertical gap or at an indented line."""
    if not lines:
        return []
    lh = sorted(l['h'] for l in lines)[len(lines) // 2]
    left = min(l['x'] for l in lines)
    paras, cur, prev = [], [], None
    for l in lines:
        gap = l['y'] - (prev['y'] + prev['h']) if prev else 0
        if cur and (gap > lh * 0.9 or l['x'] - left > lh * 1.2 and prev['x'] - left <= lh * 0.5):
            paras.append(cur)
            cur = []
        cur.append(l)
        prev = l
    paras.append(cur)
    out = []
    for p in paras:
        t = ''
        for l in p:
            s = l['text']
            t = t[:-1] + s if t.endswith('-') else (t + ' ' + s if t else s)
        out.append((t, min(l['conf'] for l in p), p[0]['x']))
    return out


def split_question(lines):
    """Right side: question stem, then the answer boxes (text indented past the circled letter)."""
    lines = [l for l in lines if not CHROME.search(l['text'])]
    lines = [l for l in lines if not re.fullmatch(r'\W*\d{1,2}\W*', l['text'])]  # the question-number box
    if not lines:
        return [], []
    stem_x = min(l['x'] for l in lines)
    lh = sorted(l['h'] for l in lines)[len(lines) // 2]
    stem, choices, last = [], [], None
    for l in lines:
        t = re.sub(r'^\W{0,3}(\(?[A-D80O©®@]\)?|[A-D])\W+(?=\w)', '', l['text']) if l['x'] - stem_x > lh * 1.5 or choices else l['text']
        if l['x'] - stem_x > lh * 2.2 or (choices and l['x'] - stem_x > lh * 1.2):
            if choices and last is not None and l['y'] - (last['y'] + last['h']) < lh * 0.9:
                choices[-1][0] += ' ' + t
                choices[-1][1] = min(choices[-1][1], l['conf'])
            else:
                choices.append([t, l['conf']])
            last = l
        elif not choices:
            stem.append(l)
        else:  # text back at stem indent after choices began: treat as part of the last choice
            choices[-1][0] += ' ' + t
    for c in choices:  # strip a leftover circled-letter token at the front
        c[0] = re.sub(r'^\W*[A-D]\W+(?=[A-Za-z0-9$−-])', '', c[0]).strip()
    return stem, choices


def h_lines(gray, x0, x1, y0, y1):
    """y of horizontal rules (answer-box borders, header bar) inside a region: rows with a long dark run."""
    px = gray.load()
    need = (x1 - x0) * 0.35
    ys = []
    for y in range(y0, y1):
        run = best = 0
        for x in range(x0, x1):
            if px[x, y] < 190:
                run += 1
                best = max(best, run)
            else:
                run = 0
        if best > need:
            ys.append(y)
    lines = []
    for y in ys:  # merge neighbouring rows into one rule
        if lines and y - lines[-1][1] <= 3:
            lines[-1][1] = y
        else:
            lines.append([y, y])
    return [(a + b) // 2 for a, b in lines]


def answer_boxes(gray, x0, x1, y0, y1):
    """Bluebook answer choices are boxed: walk the rules bottom-up pairing them into up to 4 boxes.
    Returns (header_rule_y or None, [(top, bottom), ...] in order)."""
    H = gray.height
    rules = h_lines(gray, x0, x1, y0, y1)
    boxes, i = [], len(rules) - 1
    while i >= 1 and len(boxes) < 4:
        top, bot = rules[i - 1], rules[i]
        if not (H * 0.03 < bot - top < H * 0.3):
            i -= 1
            if boxes:
                break
            continue
        if boxes and boxes[0][0] - bot > H * 0.06:
            break
        boxes.insert(0, (top, bot))
        i -= 2
    first = boxes[0][0] if boxes else y1
    above = [r for r in rules if r < first - H * 0.05]
    return (above[-1] if above else None), boxes


def number_box(gray, x0):
    """The dark square holding the question number left of 'Mark for Review' (used when the footer is cropped off)."""
    W, H = gray.size
    bx0, by0, bx1, by1 = x0, int(H * .07), x0 + (W - x0) // 2, int(H * .35)
    reg = gray.crop((bx0, by0, bx1, by1))
    px = reg.load()
    seen = set()
    for y in range(reg.height):
        for x in range(reg.width):
            if px[x, y] >= 70 or (x, y) in seen:
                continue
            stack, pts = [(x, y)], []
            seen.add((x, y))
            while stack and len(pts) < 20000:
                cx, cy = stack.pop()
                pts.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < reg.width and 0 <= ny < reg.height and (nx, ny) not in seen and px[nx, ny] < 70:
                        seen.add((nx, ny))
                        stack.append((nx, ny))
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            w, h = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
            if W * .012 < w < W * .06 and 0.6 < w / h < 1.6 and len(pts) > w * h * 0.5:
                return reg.crop((min(xs), min(ys), max(xs) + 1, max(ys) + 1))
    return None


def read_number(img, tmp):
    g = Image.eval(img, lambda v: 255 - v)
    g = g.resize((g.width * 6, g.height * 6), Image.LANCZOS)
    pad = Image.new('L', (g.width + 60, g.height + 60), 255)
    pad.paste(g, (30, 30))
    pad.save(os.path.join(tmp, 'n.png'))
    cmd = ['tesseract', os.path.join(tmp, 'n.png'), 'stdout', '--psm', '7', '-c', 'tessedit_char_whitelist=0123456789']
    if tessdir():
        cmd += ['--tessdata-dir', tessdir()]
    t = subprocess.run(cmd, capture_output=True, text=True).stdout.strip()
    return t if t.isdigit() and 1 <= int(t) <= 27 else None


def page_images(pdf, page, tmp):
    for f in os.listdir(tmp):
        if f.startswith('pg-'):
            os.remove(os.path.join(tmp, f))
    subprocess.run(['pdfimages', '-png', '-f', str(page), '-l', str(page), pdf, os.path.join(tmp, 'pg')],
                   capture_output=True)
    imgs = [Image.open(os.path.join(tmp, f)).convert('L') for f in sorted(os.listdir(tmp)) if f.startswith('pg-')]
    imgs = [i for i in imgs if i.width > 300 and i.height > 100]
    if not imgs:  # vector / text page: render it instead
        subprocess.run(['pdftoppm', '-r', '150', '-gray', '-png', '-f', str(page), '-l', str(page), pdf,
                        os.path.join(tmp, 'pg-r')], capture_output=True)
        imgs = [Image.open(os.path.join(tmp, f)).convert('L') for f in sorted(os.listdir(tmp)) if f.startswith('pg-r')]
    if len(imgs) > 1:  # several strips on one page: stack them
        w = max(i.width for i in imgs)
        canvas = Image.new('L', (w, sum(i.height for i in imgs)), 255)
        y = 0
        for i in imgs:
            canvas.paste(i, (0, y))
            y += i.height
        imgs = [canvas]
    return imgs[0] if imgs else None


def ink_without_text(gray, lines, scale):
    """Rough figure/table detector: many dark pixels outside the OCR'd text lines."""
    w, h = gray.size
    small = gray.resize((w // 4, h // 4))
    covered = set()
    for l in lines:
        for y in range(int(l['y'] / scale / 4) - 1, int((l['y'] + l['h']) / scale / 4) + 2):
            covered.add(y)
    px = small.load()
    dark = 0
    for y in range(small.height):
        if y in covered:
            continue
        dark += sum(1 for x in range(small.width) if px[x, y] < 90)
    return dark / (small.width * small.height)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('pdf')
    ap.add_argument('-o', '--out')
    ap.add_argument('--pages', help='e.g. 1-49')
    ap.add_argument('--id', default='')
    ap.add_argument('--lo', type=int, default=110, help='gray level that becomes black (raise if text is faint)')
    ap.add_argument('--hi', type=int, default=190, help='gray level that becomes white (lower to fade more watermark)')
    ap.add_argument('--min-conf', type=float, default=80)
    ap.add_argument('--crop', type=int, help='write a small grayscale PNG of this page for a visual check and exit')
    a = ap.parse_args()

    tmp = tempfile.mkdtemp()
    if a.crop:
        g = page_images(a.pdf, a.crop, tmp)
        g.thumbnail((900, 900))
        p = f'page-{a.crop}.png'
        g.save(p)
        print(p)
        return

    n = int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', a.pdf], capture_output=True, text=True).stdout).group(1))
    p0, p1 = (map(int, a.pages.split('-')) if a.pages else (1, n))
    out, flags_total, mod, last_q, is_math = [], 0, None, None, False
    if a.id:
        out.append(f'!id: {a.id}')
    for page in range(p0, p1 + 1):
        gray = page_images(a.pdf, page, tmp)
        if gray is None:
            out.append(f'!! page {page}: no image found')
            continue
        scale = max(1.0, min(4.0, 3600 / gray.width))
        W, H = gray.size
        hdr = ' '.join(l['text'] for l in ocr(prep(gray.crop((0, 0, int(W * .45), int(H * .07))), scale, a.lo, a.hi), tmp, 7))
        fcrop = gray.crop((int(W * .38), int(H * .92), int(W * .62), int(H * .995)))
        ftr = ''
        for g in (fcrop, Image.eval(fcrop, lambda v: 255 - v)):
            g = g.resize((g.width * 4, g.height * 4), Image.LANCZOS)
            g.save(os.path.join(tmp, 'f.png'))
            cmd = ['tesseract', os.path.join(tmp, 'f.png'), 'stdout', '--psm', '7'] + (['--tessdata-dir', tessdir()] if tessdir() else [])
            ftr = subprocess.run(cmd, capture_output=True, text=True).stdout
            if re.search(r'\d\s*of\s*\d', ftr):
                break
        m = re.search(r'Module\s*(\d)', hdr, re.I)
        if m:
            is_math = 'math' in hdr.lower()
        if m and m.group(1) != mod:
            mod = m.group(1)
            last_q = None
            out.append(f'=M{mod}')
            out.append(f'%% {hdr.strip()}')
        qn = re.search(r'(\d{1,2})\s*of\s*(\d{2})', ftr)
        qnum = qn.group(1) if qn else None
        body_top, body_bot = int(H * .075), int(H * .9)
        div = find_divider(gray)
        if not qnum:
            nb = number_box(gray, div + 3 if div else 0)
            qnum = read_number(nb, tmp) if nb is not None else None
        x0 = div + 3 if div else 0
        left = ocr(prep(gray.crop((0, body_top, div - 2, body_bot)), scale, a.lo, a.hi), tmp, underlines=True) if div else []
        hdr_rule, boxes = answer_boxes(gray, x0, W, body_top, body_bot)
        if len(boxes) >= 2:
            stem_top = hdr_rule + 4 if hdr_rule else int(H * 0.19)  # below the 'N | Mark for Review' bar
            stem = ocr(prep(gray.crop((x0, stem_top, W, boxes[0][0] - 2)), scale, a.lo, a.hi), tmp)
            for l in stem:
                l['text'] = CHROME_BITS.sub('', l['text'])
            stem = [l for l in stem if l['text'].strip() and not CHROME.search(l['text']) and not re.fullmatch(r'\W*\d{1,2}\W*', l['text'])]
            choices = []
            for top, bot in boxes:  # skip the circled letter at the box's left edge
                box = gray.crop((x0 + int(W * 0.06), top + 3, W, bot - 2))
                best = None
                for lo, hi, psm in ((a.lo, a.hi, 6), (a.lo + 30, a.hi + 20, 6), (a.lo, a.hi, 7)):  # keep the surest read
                    bl = ocr(prep(box, scale, lo, hi), tmp, psm, strict=False)
                    c = [' '.join(l['text'] for l in bl), min([l['conf'] for l in bl] or [0])]
                    if best is None or c[1] > best[1]:
                        best = c
                    if c[1] >= 90:
                        break
                choices.append(best)
            right = stem
        else:
            right = ocr(prep(gray.crop((x0, body_top, W, body_bot)), scale, a.lo, a.hi), tmp)
            stem, choices = split_question(right)
        if qnum and qnum == last_q:  # same question on a second screenshot (scrolled passage)
            out.append(f'!! page {page}: repeats question {qnum}; merge by hand if it adds text')
        guessed = not qnum
        if guessed:  # footer unreadable: assume the next number
            qnum = str(int(last_q) + 1) if last_q and last_q.isdigit() else '?'
        last_q = qnum
        out.append(f'#{qnum}')
        flags = []
        for t, c, _ in paragraphs(left):
            out.append(f'P: {t}')
            if c < a.min_conf:
                flags.append(f'low OCR confidence ({c:.0f}) in passage near "{t[:30]}"')
        stem_ps = paragraphs(stem)
        for i, (t, c, _) in enumerate(stem_ps):
            last = i == len(stem_ps) - 1
            out.append(('Q: ' if last or not left else 'P: ') + t)
            if c < a.min_conf:
                flags.append(f'low OCR confidence ({c:.0f}) in question')
        for letter, (t, c) in zip('ABCD', choices):
            out.append(f'{letter}) {t}')
            if c < a.min_conf:
                flags.append(f'low OCR confidence ({c:.0f}) in choice {letter}')
        if re.search(r'completes the text', ' '.join(l['text'] for l in stem)) and '______' not in text:
            flags.append('put ______ where the blank is (OCR drops it)')
        if re.search(r'underlined', ' '.join(l['text'] for l in stem)) and '<u>' not in text:
            flags.append('mark the underlined words with <u>..</u>')
        if len(choices) not in (0, 4):
            flags.append(f'found {len(choices)} answer choices, expected 4')
        if not choices:
            flags.append('no answer choices found (student-produced response?)')
        text = ' '.join(x['text'] for x in left + right)
        if is_math and MATHY.search(text):
            flags.append('math notation: check exponents, fractions and signs')
        if ink_without_text(gray.crop((0, body_top, W, body_bot)), left + right, scale) > 0.012:
            flags.append('figure or table on the page')
        if qnum == '?':
            flags.append('question number not read from the footer')
        for f in flags:
            out.append(f'!! p{page}: {f}')
        flags_total += bool(flags)
        out.append('K: ')
        out.append('E: ')
        print(f'page {page}: q{qnum} {len(choices)} choices, {len(flags)} flags', file=sys.stderr)
    txt = '\n'.join(out) + '\n'
    if a.out:
        open(a.out, 'w').write(txt)
    else:
        sys.stdout.write(txt)
    print(f'{p1 - p0 + 1} pages, {flags_total} with flags', file=sys.stderr)


if __name__ == '__main__':
    main()
