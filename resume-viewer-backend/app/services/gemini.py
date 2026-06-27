import os

from dotenv import load_dotenv
from google import genai

# Load variables from .env
load_dotenv()

# Create Gemini client
client = genai.Client(
    api_key=os.getenv("GEMINI_API_KEY")
)


def rewrite_resume_text(text: str) -> str:
    """
    Rewrite resume text to sound more professional and ATS-friendly.
    """

    prompt = f"""
You are an expert resume writer.

Rewrite the following resume text.

Rules:
- Keep the same meaning.
- Improve grammar.
- Make it ATS-friendly.
- Use strong action verbs.
- Do not invent experience.
- Return only the rewritten text.

Resume:

{text}
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    return response.text