import io
import re
from typing import Any

import pdfplumber
from fastapi import APIRouter, File, UploadFile

router = APIRouter()

SECTION_HEADINGS = {
    "summary": ("professional summary", "summary", "profile"),
    "skills": ("technical skills", "skills", "core skills"),
    "softSkills": ("soft skills",),
    "designTools": ("design tools",),
    "aiTools": ("ai-assisted development tools", "ai-assisted tools", "ai tools"),
    "toolsPlatforms": ("tools & platforms", "tools and platforms", "tools", "platforms"),
    "languages": ("languages",),
    "experience": ("experience", "work experience", "employment history"),
    "projects": ("projects", "selected projects", "academic projects"),
    "academicProjects": ("academic projects", "selected projects", "projects"),
    "education": ("education", "academic background"),
    "activities": ("activities",),
    "certifications": ("certifications", "certificates", "licenses"),
    "awards": ("awards", "honors", "recognitions"),
}


def _extract_pdf_text(uploaded_pdf: UploadFile) -> str:
    raw = uploaded_pdf.file.read()
    if not raw:
        return ""

    text_parts: list[str] = []
    with pdfplumber.open(io.BytesIO(raw)) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            text_parts.append(text)
    return "\n".join(text_parts).strip()


def _normalize_lines(lines: list[str]) -> list[str]:
    out: list[str] = []
    for line in lines:
        cleaned = re.sub(r"\s+", " ", line).strip()
        if cleaned:
            out.append(cleaned)
    return out


def _find_section(lines: list[str], headings: tuple[str, ...]) -> list[str]:
    stop_words = set()
    for values in SECTION_HEADINGS.values():
        stop_words.update(values)
    for index, line in enumerate(lines):
        lowered = line.lower().strip()
        if any(lowered == heading or lowered.startswith(heading + ":") for heading in headings):
            items: list[str] = []
            for next_line in lines[index + 1 :]:
                next_lower = next_line.lower().strip()
                if next_lower in stop_words:
                    break
                if next_lower.startswith("section") and len(next_lower.split()) <= 3:
                    break
                if re.match(r"^[A-Z][A-Za-z ]{2,}$", next_line) and next_lower not in stop_words:
                    items.append(next_line)
                    continue
                if next_line.strip():
                    items.append(next_line)
            return _normalize_lines(items)
    return []


def _parse_resume_sections(text: str) -> dict[str, Any]:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if not lines:
        return {
            "name": "",
            "contact": [],
            "summary": "",
            "skills": [],
            "softSkills": [],
            "designTools": [],
            "aiTools": [],
            "toolsPlatforms": [],
            "languages": [],
            "experience": [],
            "projects": [],
            "academicProjects": [],
            "education": [],
            "activities": [],
            "certifications": [],
            "awards": [],
        }

    name = lines[0]
    contact: list[str] = []
    for line in lines[1:8]:
        if re.search(r"@", line) or re.search(r"\b\d{3}[-. ]?\d{3}[-. ]?\d{4}\b", line) or "linkedin.com" in line.lower() or "github.com" in line.lower():
            contact.append(line)

    summary_lines = _find_section(lines, SECTION_HEADINGS["summary"])
    skills_lines = _find_section(lines, SECTION_HEADINGS["skills"])
    soft_skills_lines = _find_section(lines, SECTION_HEADINGS["softSkills"])
    design_tools_lines = _find_section(lines, SECTION_HEADINGS["designTools"])
    ai_tools_lines = _find_section(lines, SECTION_HEADINGS["aiTools"])
    tools_platforms_lines = _find_section(lines, SECTION_HEADINGS["toolsPlatforms"])
    languages_lines = _find_section(lines, SECTION_HEADINGS["languages"])
    experience_lines = _find_section(lines, SECTION_HEADINGS["experience"])
    projects_lines = _find_section(lines, SECTION_HEADINGS["projects"])
    academic_projects_lines = _find_section(lines, SECTION_HEADINGS["academicProjects"])
    education_lines = _find_section(lines, SECTION_HEADINGS["education"])
    activities_lines = _find_section(lines, SECTION_HEADINGS["activities"])
    certifications_lines = _find_section(lines, SECTION_HEADINGS["certifications"])
    awards_lines = _find_section(lines, SECTION_HEADINGS["awards"])

    return {
        "name": name,
        "contact": contact,
        "summary": " ".join(summary_lines).strip() if summary_lines else "",
        "skills": skills_lines,
        "softSkills": soft_skills_lines,
        "designTools": design_tools_lines,
        "aiTools": ai_tools_lines,
        "toolsPlatforms": tools_platforms_lines,
        "languages": languages_lines,
        "experience": experience_lines,
        "projects": projects_lines,
        "academicProjects": academic_projects_lines,
        "education": education_lines,
        "activities": activities_lines,
        "certifications": certifications_lines,
        "awards": awards_lines,
    }


@router.post("/resume-designer")
def resume_designer(file: UploadFile = File(...)) -> dict[str, Any]:
    resume_text = _extract_pdf_text(file)
    return _parse_resume_sections(resume_text)
