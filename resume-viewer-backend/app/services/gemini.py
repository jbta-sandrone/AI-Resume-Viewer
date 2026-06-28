import os
import json

from dotenv import load_dotenv
from google import genai

# Load variables from .env
load_dotenv()

# Create Gemini client
client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


def rewrite_resume_with_insights(resume_text: str):
    prompt = f"""
You are an expert ATS resume writer.

Rewrite the following resume professionally.

After rewriting, provide exactly 5 improvement suggestions.

Return ONLY valid JSON in this format:

{{
  "rewritten_resume": "...",
  "suggestions": [
    "...",
    "...",
    "...",
    "...",
    "..."
  ]
}}

Resume:

{resume_text}
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    text = response.text.strip()

    # Remove markdown code fences if present
    text = text.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {
            "rewritten_resume": text,
            "suggestions": []
        }
