import os
from huggingface_hub import InferenceClient
from dotenv import load_dotenv

load_dotenv()

token = os.getenv("HF_TOKEN")
model = "Qwen/Qwen2.5-7B-Instruct"

print(f"Using Token: {token[:5]}...{token[-5:]}" if token else "No token found")

client = InferenceClient(model=model, token=token)

try:
    print(f"Testing connectivity to {model}...")
    response = client.chat_completion(
        messages=[{"role": "user", "content": "Hello, how are you?"}],
        max_tokens=10
    )
    print(f"Response: {response.choices[0].message.content}")
except Exception as e:
    print(f"Error: {e}")
