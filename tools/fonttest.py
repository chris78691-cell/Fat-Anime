from PIL import Image, ImageDraw, ImageFont

img = Image.new("RGB", (1000, 540), "#f3f3f3")
d = ImageDraw.Draw(img)
otf = r"assets/fonts/sukajan-brush.otf"
f1 = ImageFont.truetype(otf, 130)
f2 = ImageFont.truetype(otf, 54)
f3 = ImageFont.truetype(otf, 30)
d.text((40, 25), "$FATANIME", font=f1, fill="#ff4d87")
d.text((40, 210), "MAKE YOUR ANIME PFP FAT", font=f2, fill="#1a1a1a")
d.text((40, 300), "50 of 50 custom fat pfps left today", font=f3, fill="#1a1a1a")
d.text((40, 370), "Jujutsu Kaisen  Naruto  Gallery  Requests", font=f3, fill="#1a1a1a")
d.text((40, 440), "who gets fattened next? 1234567890", font=f3, fill="#1a1a1a")
img.save("tmp/fonttest.png")
print("ok")
