import os
import base64
import json
from pathlib import Path
from PIL import Image
import io

# Configuration
DATASET_DIR = Path("../dataset_training")
OUTPUT_FILE = "training_data.jsonl"
MAX_IMAGE_SIZE = 1024  # Max dimension


def load_and_encode_image(image_path):
    """Load image, resize if needed, and encode to base64."""
    try:
        img = Image.open(image_path)

        # Convert to RGB if needed
        if img.mode != "RGB":
            img = img.convert("RGB")

        # Resize if needed (maintain aspect ratio)
        max_dim = max(img.size)
        if max_dim > MAX_IMAGE_SIZE:
            ratio = MAX_IMAGE_SIZE / max_dim
            new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=85)
        img_bytes = buffer.getvalue()
        b64 = base64.b64encode(img_bytes).decode("utf-8")

        return f"data:image/jpeg;base64,{b64}"
    except Exception as e:
        print(f"Error processing {image_path}: {e}")
        return None


def create_training_data():
    """Create training data JSONL file."""
    training_data = []

    # Process clean images
    clean_dir = DATASET_DIR / "clean"
    print(f"Processing clean images from {clean_dir}...")
    for img_file in clean_dir.glob("*"):
        if img_file.suffix.lower() in [".jpg", ".jpeg", ".png"]:
            b64_img = load_and_encode_image(img_file)
            if b64_img:
                # Use completion format for fine-tuning
                training_data.append(
                    {
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "image_url",
                                        "image_url": {"url": b64_img},
                                    },
                                    {
                                        "type": "text",
                                        "text": "Analisis gambar jalan ini dan nilaikan tingkat kebaikannya dalam bahasa Indonesia.",
                                    },
                                ],
                            },
                            {
                                "role": "assistant",
                                "content": json.dumps(
                                    {
                                        "score": 90,
                                        "category": "bersih",
                                        "recommendation": "Jalan dalam kondisi bersih. Pertahankan dengan perawatan rutin.",
                                    }
                                ),
                            },
                        ]
                    }
                )
                print(f"  Added: {img_file.name}")

    # Process dirty images
    dirty_dir = DATASET_DIR / "dirty"
    print(f"Processing dirty images from {dirty_dir}...")
    for img_file in dirty_dir.glob("*"):
        if img_file.suffix.lower() in [".jpg", ".jpeg", ".png"]:
            b64_img = load_and_encode_image(img_file)
            if b64_img:
                # Use completion format for fine-tuning
                training_data.append(
                    {
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {
                                        "type": "image_url",
                                        "image_url": {"url": b64_img},
                                    },
                                    {
                                        "type": "text",
                                        "text": "Analisis gambar jalan ini dan nilaikan tingkat kebaikannya dalam bahasa Indonesia.",
                                    },
                                ],
                            },
                            {
                                "role": "assistant",
                                "content": json.dumps(
                                    {
                                        "score": 20,
                                        "category": "kotor",
                                        "recommendation": "Kondisi kritis! Banyak sampah terlihat. Segera kirim tim pembersih.",
                                    }
                                ),
                            },
                        ]
                    }
                )
                print(f"  Added: {img_file.name}")

    # Write to JSONL
    print(f"\nWriting {len(training_data)} samples to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        for item in training_data:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")

    print(f"Done! Created {OUTPUT_FILE} with {len(training_data)} samples.")
    # Count based on score in assistant content
    clean_count = sum(
        1 for x in training_data if '"score": 90' in x["messages"][1]["content"]
    )
    dirty_count = len(training_data) - clean_count
    print(f"  - Clean: {clean_count}")
    print(f"  - Dirty: {dirty_count}")


if __name__ == "__main__":
    create_training_data()
