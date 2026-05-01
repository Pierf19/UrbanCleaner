import os
import time
from mistralai.client import Mistral

# Configuration
API_KEY = "G6uLbvM3dMCwRfOqkWBgOc7ki5bIYPjK"
TRAINING_FILE = "training_data.jsonl"
MODEL = "pixtral-12b-latest"


def main():
    # Initialize Mistral client
    print("Initializing Mistral client...")
    client = Mistral(api_key=API_KEY)

    # Step 1: Upload file
    print(f"\n[1/3] Uploading {TRAINING_FILE}...")
    with open(TRAINING_FILE, "rb") as f:
        uploaded_file = client.files.upload(
            file={"file_name": TRAINING_FILE, "content": f.read()},
            purpose="fine-tune",
        )

    print(f"  File uploaded! ID: {uploaded_file.id}")

    # Step 2: Create fine-tuning job
    print(f"\n[2/3] Creating fine-tuning job...")
    job = client.fine_tuning.jobs.create(
        model=MODEL,
        training_files=[{"file_id": uploaded_file.id, "weight": 1}],
        hyperparameters={"epochs": 3, "learning_rate": 0.0001},
        job_type="completion",
        auto_start=True,
    )

    print(f"  Job created! ID: {job.id}")
    print(f"  Model will be: {job.fine_tuned_model}")
    print(f"\n  Status: {job.status}")

    # Step 3: Wait and monitor
    print(f"\n[3/3] Monitoring training...")
    print("-" * 50)
    print(f"Job ID: {job.id}")
    print(f"Status: {job.status}")
    print(f"Model: {job.fine_tuned_model}")
    print("-" * 50)

    print("\nTo check status later, run:")
    print(f"  python check_status.py --job_id {job.id}")

    print("\nAfter training completes, update convex/ai.ts:")
    print(f'  - Change model from "{MODEL}" to "{job.fine_tuned_model}"')


if __name__ == "__main__":
    main()
