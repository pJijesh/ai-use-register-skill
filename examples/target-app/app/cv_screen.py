"""Scores candidate CVs for the recruitment team (fictional)."""
import os
import requests

RUBRIC = open("prompts/cv_rubric.txt").read()


def score_candidate(cv_text: str, candidate_name: str) -> dict:
    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": "Bearer " + os.environ["OPENAI_API_KEY"]},
        json={
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": RUBRIC},
                {"role": "user", "content": f"Candidate: {candidate_name}\n{cv_text}"},
            ],
        },
        timeout=30,
    )
    return response.json()


def shortlist(cvs: list) -> list:
    scored = [(score_candidate(c["text"], c["name"]), c) for c in cvs]
    return [c for s, c in scored if s.get("score", 0) >= 70]
