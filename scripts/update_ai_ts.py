import json
from pathlib import Path
from PIL import Image
import base64
import io


def encode_image(path):
    img = Image.open(path)
    if img.mode != "RGB":
        img = img.convert("RGB")
    if max(img.size) > 512:
        ratio = 512 / max(img.size)
        img = img.resize(
            (int(img.size[0] * ratio), int(img.size[1] * ratio)),
            Image.Resampling.LANCZOS,
        )
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=70)
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


# Load the examples from generated file
with open("prompt_examples.json", "r") as f:
    examples = json.load(f)

# Update the ai.ts file with actual base64 values
ai_ts_path = "../convex/ai.ts"
with open(ai_ts_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace placeholders
content = content.replace("PLACEHOLDER_CLEAN_1", examples[0]["base64"])
content = content.replace("PLACEHOLDER_CLEAN_2", examples[1]["base64"])
content = content.replace("PLACEHOLDER_DIRTY_1", examples[2]["base64"])
content = content.replace("PLACEHOLDER_DIRTY_2", examples[3]["base64"])

with open(ai_ts_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated convex/ai.ts with actual base64 images!")
print(
    f"Example sizes: {len(examples[0]['base64'])} chars, {len(examples[1]['base64'])} chars, {len(examples[2]['base64'])} chars, {len(examples[3]['base64'])} chars"
)
