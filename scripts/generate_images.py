import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT / "data/manifests/images.json").read_text())
out_dir = ROOT / "data/images"
out_dir.mkdir(parents=True, exist_ok=True)

palette = {
    "animal": ("#f4a261", "#2a9d8f"),
    "food": ("#e9c46a", "#bc6c25"),
    "technology": ("#90caf9", "#1d3557"),
    "nature": ("#a7c957", "#386641"),
    "transport": ("#adb5bd", "#343a40"),
    "people": ("#ffcad4", "#6d597a"),
    "object": ("#dee2e6", "#495057"),
}

try:
    font = ImageFont.truetype("Arial.ttf", 28)
    small = ImageFont.truetype("Arial.ttf", 18)
except Exception:
    font = ImageFont.load_default()
    small = ImageFont.load_default()

for item in manifest:
    bg, fg = palette.get(item["category"], ("#ffffff", "#111111"))
    image = Image.new("RGB", (640, 420), bg)
    draw = ImageDraw.Draw(image)
    draw.rectangle([26, 26, 614, 394], outline=fg, width=8)
    draw.ellipse([250, 70, 390, 210], fill=fg)
    draw.text((48, 250), item["subject"].title(), fill=fg, font=font)
    draw.text((48, 295), item["category"].upper(), fill=fg, font=small)
    draw.text((48, 330), " / ".join(item["attributes"][:3]), fill=fg, font=small)
    image.save(out_dir / item["file"])

print(f"Generated {len(manifest)} images in {out_dir}")
