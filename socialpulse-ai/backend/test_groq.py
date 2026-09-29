import httpx
import os
from dotenv import load_dotenv

load_dotenv('c:/Users/Hp/Desktop/social media recommended/socialpulse-ai/backend/.env')
groq_url = 'https://api.groq.com/openai/v1/chat/completions'
headers = {'Authorization': f'Bearer {os.getenv("GROQ_API_KEY")}', 'Content-Type': 'application/json'}
payload = {'model': 'llama3-8b-8192', 'messages': [{'role': 'user', 'content': 'hello'}]}
res = httpx.post(groq_url, headers=headers, json=payload)
print(res.status_code, res.text)
