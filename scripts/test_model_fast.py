import os
import json
import base64
import requests
import time
from pathlib import Path
from dotenv import load_dotenv
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
)
import matplotlib.pyplot as plt
import seaborn as sns

load_dotenv(".env.local")

API_KEY = os.getenv("MISTRAL_API_KEY")
TRAIN_DIR = Path("dataset_training")
TEST_DIR = Path("dataset_training/test")
OUTPUT_DIR = Path("scripts/output")
OUTPUT_DIR.mkdir(exist_ok=True)


def encode_image(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()


def get_mime(path):
    ext = Path(path).suffix.lower()
    return {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png"}.get(
        ext, "image/jpeg"
    )


def load_examples():
    examples = []

    clean_dir = TRAIN_DIR / "clean"
    dirty_dir = TRAIN_DIR / "dirty"

    clean_imgs = list(clean_dir.glob("*"))[:4]
    dirty_imgs = list(dirty_dir.glob("*"))[:3]

    for p in clean_imgs:
        examples.append(
            {
                "image_path": str(p),
                "result": {
                    "score": 85,
                    "category": "bersih",
                    "recommendation": "Jalan bersih, pertahankan!",
                },
            }
        )

    for p in dirty_imgs:
        examples.append(
            {
                "image_path": str(p),
                "result": {
                    "score": 15,
                    "category": "kotor",
                    "recommendation": "Perlu pembersihan mendesak",
                },
            }
        )

    return examples


INSTRUCTION = """Analisis gambar jalan ini dan tentukan kategorinya:
- Score 70-100: bersih
- Score 40-69: sedang  
- Score 0-39: kotor

Jawab JSON dengan format: {"score": 0-100, "category": "bersih/sedang/kotor", "recommendation": "..."}"""


def predict(image_path, examples):
    messages = []

    for ex in examples:
        b64 = encode_image(ex["image_path"])
        messages.append(
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Analisis gambar ini."},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
                    },
                ],
            }
        )
        messages.append(
            {
                "role": "assistant",
                "content": [{"type": "text", "text": json.dumps(ex["result"])}],
            }
        )

    test_b64 = encode_image(image_path)
    messages.append(
        {
            "role": "user",
            "content": [
                {"type": "text", "text": INSTRUCTION},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{get_mime(image_path)};base64,{test_b64}"
                    },
                },
            ],
        }
    )

    resp = requests.post(
        "https://api.mistral.ai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": "pixtral-12b-2409",
            "response_format": {"type": "json_object"},
            "messages": messages,
        },
        timeout=60,
    )

    data = resp.json()
    if not resp.ok:
        raise Exception(f"API Error {resp.status_code}: {str(data)[:300]}")
    if "choices" not in data:
        raise Exception(f"No choices: {str(data)[:300]}")
    return json.loads(data["choices"][0]["message"]["content"])


def run():
    print("=" * 60)
    print("        EVALUASI MODEL FEW-SHOT CLEANLINESS")
    print("=" * 60)

    examples = load_examples()
    print(f"Loaded {len(examples)} few-shot examples")

    test_images = []
    for p in (TEST_DIR / "clean").glob("*"):
        if p.suffix.lower() in [".jpg", ".jpeg", ".png"]:
            test_images.append((str(p), "bersih"))
    for p in (TEST_DIR / "dirty").glob("*"):
        if p.suffix.lower() in [".jpg", ".jpeg", ".png"]:
            test_images.append((str(p), "kotor"))

    print(f"Total: {len(test_images)} test images")

    results = []
    for i, (path, actual) in enumerate(test_images):
        try:
            print(f"[{i + 1}/{len(test_images)}] {Path(path).name} (actual: {actual})")
            pred = predict(path, examples)
            category = pred.get("category", "unknown").lower()
            results.append(
                {
                    "image": Path(path).name,
                    "actual": actual,
                    "predicted": category,
                    "score": pred.get("score"),
                }
            )
            print(f"  -> predicted: {category} (score: {pred.get('score')})")
        except Exception as e:
            print(f"  Error: {e}")
            results.append(
                {
                    "image": Path(path).name,
                    "actual": actual,
                    "predicted": "error",
                    "error": str(e)[:100],
                }
            )

        if i < len(test_images) - 1:
            time.sleep(1)

    valid_results = [r for r in results if r["predicted"] != "error"]
    y_true = [r["actual"] for r in valid_results]
    y_pred = [r["predicted"] for r in valid_results]

    classes = ["bersih", "kotor"]
    acc = accuracy_score(y_true, y_pred)
    prec, rec, f1, _ = precision_recall_fscore_support(
        y_true, y_pred, labels=classes, average=None, zero_division=0
    )
    cm = confusion_matrix(y_true, y_pred, labels=classes)

    print("\n" + "=" * 60)
    print("                    HASIL EVALUASI")
    print("=" * 60)
    print(f"\nValid predictions: {len(valid_results)}/{len(results)}")
    print(f"Accuracy: {acc * 100:.2f}%")
    print(f"\nPer-Class (bersih/kotor):")
    print(f"  Precision: {prec[0]:.2f} / {prec[1]:.2f}")
    print(f"  Recall:    {rec[0]:.2f} / {rec[1]:.2f}")
    print(f"  F1-Score:  {f1[0]:.2f} / {f1[1]:.2f}")
    print(f"\nConfusion Matrix:")
    print(f"        Predicted")
    print(f"        Bersih  Kotor")
    print(f"Actual Bersih   {cm[0][0]:>3}   {cm[0][1]:>3}")
    print(f"       Kotor    {cm[1][0]:>3}   {cm[1][1]:>3}")

    json.dump(
        {
            "accuracy": acc,
            "precision": prec.tolist(),
            "recall": rec.tolist(),
            "f1": f1.tolist(),
            "confusion_matrix": cm.tolist(),
            "results": results,
        },
        open(OUTPUT_DIR / "metrics.json", "w"),
        indent=2,
    )

    fig, axes = plt.subplots(1, 2, figsize=(12, 5))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=["bersih", "kotor"],
        yticklabels=["bersih", "kotor"],
        ax=axes[0],
    )
    axes[0].set_title("Confusion Matrix")
    axes[0].set_xlabel("Predicted")
    axes[0].set_ylabel("Actual")

    metrics = [prec[0], prec[1], rec[0], rec[1], f1[0], f1[1]]
    labels = [
        "bersih\nprec",
        "kotor\nprec",
        "bersih\nrec",
        "kotor\nrec",
        "bersih\nf1",
        "kotor\nf1",
    ]
    axes[1].bar(labels, metrics, color=["#3498db", "#e74c3c"] * 3)
    axes[1].set_ylabel("Score")
    axes[1].set_title(f"Metrics (Accuracy: {acc * 100:.1f}%)")
    axes[1].set_ylim(0, 1.1)

    plt.tight_layout()
    plt.savefig(OUTPUT_DIR / "evaluation_results.png")
    print(f"\nResults saved to scripts/output/")


if __name__ == "__main__":
    run()
