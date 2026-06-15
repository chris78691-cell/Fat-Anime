# Compare Japanese rendering: Dela Gothic (current, mushed) vs Zen Kaku (fix).
from PIL import Image, ImageDraw, ImageFont

img = Image.new("RGB", (900, 360), "#1b1822")
d = ImageDraw.Draw(img)
dela = ImageFont.truetype("tmp/DelaGothicOne.ttf", 44)
zen = ImageFont.truetype("tmp/ZenKaku-Bold.ttf", 44)
zen_s = ImageFont.truetype("tmp/ZenKaku-Bold.ttf", 30)
d.text((30, 30), "Dela:  もぐもぐ劇場 / アニメアイコンを太らせよう", font=dela, fill="#fff")
d.text((30, 150), "Zen:   もぐもぐ劇場 / アニメアイコンを太らせよう", font=zen, fill="#fff")
d.text((30, 260), "Zen 30px: 次に太らせるのは？ 空きが出たら通知する", font=zen_s, fill="#fff")
img.save("tmp/jptest.png")
print("ok")
