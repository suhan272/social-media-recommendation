import os
from dotenv import load_dotenv
import requests

load_dotenv()

groq_key = os.environ.get("GROQ_API_KEY")
hindsight_key = os.environ.get("HINDSIGHT_API_KEY")

print("Testing GROQ API...")
if groq_key:
    headers = {"Authorization": f"Bearer {groq_key}"}
    try:
        res = requests.get("https://api.groq.com/openai/v1/models", headers=headers)
        if res.status_code == 200:
            print("GROQ API: Success! Successfully authenticated.")
        else:
            print(f"GROQ API: Failed with status {res.status_code}. Response: {res.text}")
    except Exception as e:
        print("GROQ API: Exception during request:", str(e))
else:
    print("GROQ API Key not found.")

print("\nTesting Hindsight API...")
if hindsight_key:
    # Just try a dummy request to check authentication/reachability
    headers = {"Authorization": f"Bearer {hindsight_key}", "Content-Type": "application/json"}
    try:
        # Assuming there is a /models or similar we can just GET, or simply testing base URL
        res = requests.get("https://api.hindsight.com/v1/memories", headers=headers)
        print(f"Hindsight API: Status {res.status_code}. Response: {res.text}")
    except Exception as e:
        print("Hindsight API: Exception during request:", str(e))
else:
    print("Hindsight API Key not found.")
