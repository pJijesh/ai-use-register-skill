"""Internal meeting summariser using a model on the office server (fictional)."""
import requests


def summarise(transcript: str) -> str:
    r = requests.post(
        "http://localhost:11434/api/generate",
        json={"model": "llama3.1:8b", "prompt": "Summarise in five bullets:\n" + transcript},
        timeout=120,
    )
    return r.json()["response"]
