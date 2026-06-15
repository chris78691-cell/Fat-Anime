# Simulate browser per-glyph fallback: $ + digits in Dela Gothic, letters in Sukajan.
from PIL import Image, ImageDraw, ImageFont

brush = "assets/fonts/sukajan-brush.otf"
dela = "tmp/DelaGothicOne.ttf"
img = Image.new("RGB", (1000, 360), "#1b1822")
d = ImageDraw.Draw(img)

def line(x, y, segments):
    cx = x
    for text, fontpath, size, color in segments:
        f = ImageFont.truetype(fontpath, size)
        d.text((cx, y), text, font=f, fill=color)
        cx += d.textlength(text, font=f)

# logo: $ falls back to Dela, FATANIME in brush
line(40, 40, [("$", dela, 96, "#ff4d87"), ("FATANIME", brush, 120, "#ff4d87")])
# counter: words in brush, 50 in Dela (fallback)
line(40, 210, [("50", dela, 40, "#ff4d87"), (" OF 50 CUSTOM FAT PFPS LEFT", brush, 44, "#ffffff")])
img.save("tmp/logomock.png")
print("ok")
