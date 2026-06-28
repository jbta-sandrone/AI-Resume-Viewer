from fastapi import APIRouter, File, UploadFile, Form

from app.services.analyzer import analyze_resume_pdf
from app.services.gemini import generate_cover_letter_with_gemini

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

