# sheet.py <dir> <first> <last> <out> [cols] [thumbw] : contact sheet of rendered pages with page numbers
import sys, glob, os
from PIL import Image, ImageDraw
d, a, b, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
cols = int(sys.argv[5]) if len(sys.argv) > 5 else 4
tw = int(sys.argv[6]) if len(sys.argv) > 6 else 480
fs = sorted(glob.glob(os.path.join(d, 'p-*.png')), key=lambda f: int(f.split('-')[-1][:-4]))
fs = [f for f in fs if a <= int(f.split('-')[-1][:-4]) <= b]
ims = []
for f in fs:
    im = Image.open(f).convert('L'); im.thumbnail((tw, tw * 2)); ims.append((f, im))
th = max(i.height for _, i in ims)
rows = (len(ims) + cols - 1) // cols
c = Image.new('L', (cols * tw, rows * (th + 18)), 255); dr = ImageDraw.Draw(c)
for k, (f, im) in enumerate(ims):
    x, y = (k % cols) * tw, (k // cols) * (th + 18)
    dr.text((x + 4, y + 2), 'p' + f.split('-')[-1][:-4], fill=0); c.paste(im, (x, y + 16))
c.save(out)
