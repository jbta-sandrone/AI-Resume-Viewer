import io
import json
import os

from dotenv import load_dotenv
from google import genai
import pdfplumber

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def _extract_pdf_text(uploaded_pdf) -> str:
    raw = uploaded_pdf.file.read()
    if not raw:
        return ""

    text_parts: list[str] = []
    with pdfplumber.open(io.BytesIO(raw)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            text_parts.append(page_text)
    return "\n".join(text_parts).strip()


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
    text = text.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {
            "rewritten_resume": text,
            "suggestions": []
        }


def generate_cover_letter_with_gemini(uploaded_pdf, position: str, job_description: str, company_name: str | None = None):
    resume_text = _extract_pdf_text(uploaded_pdf)

    company_context = f" for {company_name}" if company_name else ""
    prompt = f"""
You are an expert career writer and ATS strategist.

Write a unique, professional, tailored cover letter for the following role{company_context}.

Requirements:
- Use only information that is clearly supported by the provided resume.
- Avoid invented qualifications, companies, or achievements.
- Sound natural, polished, and specific to the job description.
- Mention the target position and company name when provided.
- Highlight the most relevant experience and skills from the resume.
- Keep the letter concise, persuasive, and ATS-friendly.
- Return only the generated cover letter as plain text.

Position: {position}
Company: {company_name or 'Not provided'}
Job Description:
{job_description}

Resume:
{resume_text}
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    text = response.text.strip()
    text = text.replace("```", "").strip()

    return {"cover_letter": text}
