from fastapi import APIRouter, File, UploadFile, Form

from app.services.analyzer import analyze_resume_pdf
from app.services.gemini import (
    generate_cover_letter_with_gemini,
    generate_interview_questions_with_gemini,
    evaluate_interview_answer_with_gemini,
    chat_with_resume_assistant,
)

router = APIRouter()


@router.post("/analyze")
def analyze(
    file: UploadFile = File(...),
    job_description: str | None = Form(None),
    target_skills: str | None = Form(None),
    rewrite: bool = Form(False),
):
    target_skills_list = None
    if target_skills:
        target_skills_list = [s.strip() for s in target_skills.split(",") if s.strip()]

    return analyze_resume_pdf(
        uploaded_pdf=file,
        job_description=job_description,
        target_skills=target_skills_list,
        run_rewrite=rewrite,
    )


@router.post("/cover-letter")
def cover_letter(
    file: UploadFile = File(...),
    position: str = Form(...),
    job_description: str = Form(...),
    company_name: str | None = Form(None),
):
    return generate_cover_letter_with_gemini(
        uploaded_pdf=file,
        position=position,
        job_description=job_description,
        company_name=company_name,
    )


@router.post("/interview-questions")
def interview_questions(file: UploadFile = File(...)):
    return generate_interview_questions_with_gemini(uploaded_pdf=file)


@router.post("/interview-evaluate")
def interview_evaluate(
    question: str = Form(...),
    answer: str = Form(...),
):
    return evaluate_interview_answer_with_gemini(question=question, answer=answer)


@router.post("/resume-chat")
def resume_chat(
    message: str = Form(...),
    file: UploadFile | None = File(None),
    conversation_history: str | None = Form(None),
):
    resume_text = ""
    history = None

    if file is not None and getattr(file, "filename", None):
        raw = file.file.read()
        if raw:
            text_parts: list[str] = []
            import io
            import pdfplumber

            with pdfplumber.open(io.BytesIO(raw)) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text() or ""
                    text_parts.append(page_text)
            resume_text = "\n".join(text_parts).strip()

    if conversation_history:
        import json

        try:
            parsed_history = json.loads(conversation_history)
            if isinstance(parsed_history, list):
                history = parsed_history
        except json.JSONDecodeError:
            history = None

    return chat_with_resume_assistant(
        message=message,
        resume_text=resume_text or None,
        conversation_history=history,
    )

