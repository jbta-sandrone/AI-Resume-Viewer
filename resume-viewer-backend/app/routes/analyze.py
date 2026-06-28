from fastapi import APIRouter, File, UploadFile, Form

from app.services.analyzer import analyze_resume_pdf

router = APIRouter()


@router.post("/analyze")
def analyze(
    file: UploadFile = File(...),
    job_description: str | None = Form(None),
    target_skills: str | None = Form(None),
    rewrite: bool = Form(False),
):
    # target_skills can be comma-separated
    target_skills_list = None
    if target_skills:
        target_skills_list = [s.strip() for s in target_skills.split(",") if s.strip()]

    return analyze_resume_pdf(
        uploaded_pdf=file,
        job_description=job_description,
        target_skills=target_skills_list,
        run_rewrite=rewrite,
    )

