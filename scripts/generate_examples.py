import base64
from pathlib import Path
from PIL import Image
import io
import json


def encode_image(path):
    img = Image.open(path)
    if img.mode != "RGB":
        img = img.convert("RGB")
    # Resize to smaller for prompt
    if max(img.size) > 512:
        ratio = 512 / max(img.size)
        img = img.resize(
            (int(img.size[0] * ratio), int(img.size[1] * ratio)),
            Image.Resampling.LANCZOS,
        )
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=70)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


# Select representative images - 10 total (4 existing + 6 new)
examples = [
    {
        "type": "clean",
        "path": "../dataset_training/clean/WhatsApp Image 2020-12-30 at 9.06.19 AM.jpeg",
        "result": {
            "score": 90,
            "category": "bersih",
            "recommendation": "Jalan dalam kondisi bersih. Pertahankan dengan perawatan rutin.",
        },
    },
    {
        "type": "clean",
        "path": "../dataset_training/clean/WhatsApp Image 2021-01-11 at 9.15.36 AM.jpeg",
        "result": {
            "score": 85,
            "category": "bersih",
            "recommendation": "Trotoar bersih dan tertata dengan baik.",
        },
    },
    {
        "type": "dirty",
        "path": "../dataset_training/dirty/00939_05.jpg",
        "result": {
            "score": 20,
            "category": "kotor",
            "recommendation": "Banyak sampah terlihat. Segera kirim tim pembersih.",
        },
    },
    {
        "type": "dirty",
        "path": "../dataset_training/dirty/00413_07.jpg",
        "result": {
            "score": 15,
            "category": "kotor",
            "recommendation": "Kondisi kritis. Lingkungan sangat kotor dengan banyak sampah.",
        },
    },
    # New examples
    {
        "type": "clean",
        "path": "../dataset_training/clean/WhatsApp Image 2020-12-28 at 7.41.13 PM.jpeg",
        "result": {
            "score": 80,
            "category": "bersih",
            "recommendation": "Jalan bersih dengan trotoar yang tertata rapih.",
        },
    },
    {
        "type": "clean",
        "path": "../dataset_training/clean/WhatsApp Image 2020-12-30 at 9.06.18 AM.jpeg",
        "result": {
            "score": 75,
            "category": "bersih",
            "recommendation": "Kondisi jalan baik, sedikit noda namun masih layak.",
        },
    },
    {
        "type": "dirty",
        "path": "../dataset_training/dirty/00410_06.jpg",
        "result": {
            "score": 35,
            "category": "kotor",
            "recommendation": "Banyak sampah di pinggir jalan. Perlu pembersihan segera.",
        },
    },
    {
        "type": "dirty",
        "path": "../dataset_training/dirty/00151_03.jpg",
        "result": {
            "score": 25,
            "category": "kotor",
            "recommendation": "Lingkungan kotor dengan sampah berserakan. Segera ditangani.",
        },
    },
    {
        "type": "sedang",
        "path": "../dataset_training/dirty/5d4b64a970130.jpeg",
        "result": {
            "score": 55,
            "category": "sedang",
            "recommendation": "Kondisi sedang, ada sampah ringan yang perlu dibersihkan.",
        },
    },
    {
        "type": "sedang",
        "path": "../dataset_training/dirty/5c5cb64017abb.jpeg",
        "result": {
            "score": 60,
            "category": "sedang",
            "recommendation": "Trotoar perlu sedikit perbaikan dan pembersihan.",
        },
    },
]

# Encode all images
for ex in examples:
    ex["base64"] = encode_image(ex["path"])

# Save to file
with open("prompt_examples.json", "w", encoding="utf-8") as f:
    json.dump(examples, f, ensure_ascii=False, indent=2)

print("Generated prompt_examples.json")
print(f"Total examples: {len(examples)}")
print(f"Clean: {sum(1 for x in examples if x['type'] == 'clean')}")
print(f"Dirty: {sum(1 for x in examples if x['type'] == 'dirty')}")
print(f"Sedang: {sum(1 for x in examples if x['type'] == 'sedang')}")

# Print base64 for each
for i, ex in enumerate(examples, 1):
    print(f"\n--- Example {i}: {ex['type']} ---")
    print(f"Base64 length: {len(ex['base64'])} chars")
    print(f"Result: {ex['result']}")
