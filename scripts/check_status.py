import argparse
from mistralai.client import Mistral

# Configuration
API_KEY = "G6uLbvM3dMCwRfOqkWBgOc7ki5bIYPjK"


def main():
    parser = argparse.ArgumentParser(description="Check fine-tuning job status")
    parser.add_argument("--job_id", required=True, help="Job ID from training")
    args = parser.parse_args()

    client = Mistral(api_key=API_KEY)

    print(f"Checking status for job: {args.job_id}")
    print("-" * 50)

    job = client.fine_tuning.jobs.get(job_id=args.job_id)

    print(f"Status: {job.status}")
    print(f"Model: {job.fine_tuned_model or 'Not yet available'}")
    print(f"Created at: {job.created_at}")
    print(f"Finished at: {job.finished_at}")

    if job.status == "FAILED":
        print(f"\nError: {job.error}")
    elif job.status == "SUCCESS":
        print(f"\n✓ Training complete!")
        print(f"Use this model name in convex/ai.ts:")
        print(f"  {job.fine_tuned_model}")


if __name__ == "__main__":
    main()
