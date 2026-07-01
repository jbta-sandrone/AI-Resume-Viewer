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


def chat_with_resume_assistant(message: str, resume_text: str | None = None, conversation_history: list[dict[str, str]] | None = None):
    history_text = ""
    if conversation_history:
        history_lines = []
        for item in conversation_history:
            role = str(item.get("role", "user")).strip()
            content = str(item.get("content", "")).strip()
            if role and content:
                history_lines.append(f"{role.capitalize()}: {content}")
        if history_lines:
            history_text = "\n".join(history_lines)

    resume_context = f"\nResume text:\n{resume_text}" if resume_text else ""
    conversation_context = f"\nConversation history:\n{history_text}" if history_text else ""

    prompt = f"""
You are an AI Resume Career Assistant (NelWorks AI). You only help with resume, career, job application, ATS, cover letter, interview, skills, portfolio, and hiring-related topics.

If the user asks anything unrelated, politely refuse and remind them you only help with resume and career-related topics.
If resume text is provided, use it to give specific advice.
If no resume is provided, give general but useful guidance.
Do not invent resume details that are not provided.
Keep answers practical, clear, and beginner-friendly.
When giving resume rewrites, make them professional and ATS-friendly.
When giving advice, use short sections or bullet points when helpful.
{resume_context}
{conversation_context}

User message:
{message}
"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
        )
    except Exception as e:
        return {
            "reply": f"🤖 Gemini AI is currently experiencing high demand. Your request successfully reached the AI service, but it is temporarily unavailable. Please wait a few moments and try again. If the issue persists, the free Gemini quota or service may be temporarily busy.({str(e)})"
        }

    text = response.text.strip()
    if not text:
        return {"reply": "I’m here to help with resume and career guidance. Please share a question or paste your resume text for more tailored advice."}

    return {"reply": text}


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

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",   # or keep 2.5-flash if you want
            contents=prompt,
    )
    except Exception as e:
        return {
            "error": f"Gemini is busy try again later: {str(e)}"
    }

    text = response.text.strip()
    text = text.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {
            "rewritten_resume": text,
            "suggestions": []
        }


def generate_interview_questions_with_gemini(uploaded_pdf):
    resume_text = _extract_pdf_text(uploaded_pdf)

    prompt = f"""
You are an expert technical recruiter and career coach.

Analyze the following resume carefully before generating interview questions. The questions must feel personalized, realistic, and based on the candidate's actual background, including skills, technologies, projects, education, experience, certifications, and any resume strengths or weaknesses.

Requirements:
- Generate 8 to 10 questions total.
- Group them into 5 categories: Technical Questions, Behavioral Questions, Project Questions, Problem Solving, and HR Questions.
- Each category should contain 2 to 3 questions.
- Make the questions sound like they came from a real interviewer.
- Sample answers should be concise, professional, and suitable for fresh graduates or junior developers.
- If the resume contains projects, include project-specific questions.
- If the resume mentions programming languages or frameworks, include technical questions around them.
- If the resume has gaps or weaker areas, include a few questions that let the candidate explain them professionally.
- Return ONLY valid JSON in this format:
{{"categories": [{{"title": "Technical Questions", "questions": [{{"question": "...", "answer": "..."}}]}}]}}

Resume:
{resume_text}
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=prompt,
    )

    text = response.text.strip()
    text = text.replace("```json", "").replace("```", "").strip()

    try:
        data = json.loads(text)
        categories = data.get("categories", []) if isinstance(data, dict) else []
        if not isinstance(categories, list):
            categories = []

        normalized_categories = []
        for category in categories:
            if not isinstance(category, dict):
                continue

            title = str(category.get("title", "")).strip() or "Questions"
            questions = category.get("questions", [])
            if not isinstance(questions, list):
                questions = []

            normalized_questions = []
            for item in questions:
                if not isinstance(item, dict):
                    continue
                question = str(item.get("question", "")).strip()
                answer = str(item.get("answer", "")).strip()
                if question and answer:
                    normalized_questions.append({"question": question, "answer": answer})

            if normalized_questions:
                normalized_categories.append({"title": title, "questions": normalized_questions})

        return {"categories": normalized_categories}
    except json.JSONDecodeError:
        return {"categories": []}


def evaluate_interview_answer_with_gemini(question: str, answer: str):
    prompt = f"""
You are an experienced technical interviewer and career coach.

Evaluate the following interview answer.

Requirements:
- Score the answer from 1 to 10.
- Provide strengths as a short list.
- Provide weaknesses as a short list.
- Provide suggestions for improvement as a short list.
- Provide a better sample answer that is concise, professional, and suitable for a fresh graduate or junior developer.
- Return ONLY valid JSON in this format:
{{"score": 7, "strengths": ["..."], "weaknesses": ["..."], "suggestions": ["..."], "better_sample_answer": "..."}}

Interview Question:
{question}

Candidate Answer:
{answer}
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash-lite",
        contents=prompt,
    )

    text = response.text.strip()
    text = text.replace("```json", "").replace("```", "").strip()

    try:
        data = json.loads(text)
        return {
            "score": int(data.get("score", 5)) if str(data.get("score", "")).isdigit() else 5,
            "strengths": data.get("strengths", []) if isinstance(data.get("strengths", []), list) else [],
            "weaknesses": data.get("weaknesses", []) if isinstance(data.get("weaknesses", []), list) else [],
            "suggestions": data.get("suggestions", []) if isinstance(data.get("suggestions", []), list) else [],
            "better_sample_answer": str(data.get("better_sample_answer", "")).strip(),
        }
    except json.JSONDecodeError:
        return {
            "score": 5,
            "strengths": [],
            "weaknesses": [],
            "suggestions": [],
            "better_sample_answer": "I would answer this by focusing on the impact of my work, showing ownership, and giving a concise example."
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
        model="gemini-2.5-flash-lite",
        contents=prompt,
    )

    text = response.text.strip()
    text = text.replace("```", "").strip()

    return {"cover_letter": text}
