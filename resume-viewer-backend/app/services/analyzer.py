from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Any
import io

import pdfplumber


def _extract_pdf_text(uploaded_pdf) -> str:
    # Read file bytes, then parse via pdfplumber
    raw = uploaded_pdf.file.read()
    if not raw:
        return ""

    text_parts: list[str] = []
    with pdfplumber.open(io.BytesIO(raw)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            text_parts.append(page_text)
    return "\n".join(text_parts).strip()


def _normalize_skill(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9+.#\- ]+", "", s)
    s = re.sub(r"\s+", " ", s)
    return s


def _extract_target_skills_from_job(job_description: str) -> list[str]:
    # Heuristic: capture comma/semicolon lists and common skill patterns
    jd = job_description or ""
    jd_low = jd.lower()

    # Prefer explicit lists first
    chunks = re.split(r"[,;\n]", jd)
    candidates = []
    for c in chunks:
        c2 = c.strip()
        if not c2:
            continue
        # Keep short-ish phrases that look like skills
        if 2 <= len(c2) <= 40 and re.search(r"[a-z]", c2):
            candidates.append(c2)

    # Also try to find common keywords
    keyword_skills = [
        "python",
        "fastapi",
        "react",
        "javascript",
        "typescript",
        "sql",
        "postgres",
        "mysql",
        "docker",
        "kubernetes",
        "aws",
        "gcp",
        "azure",
        "rest",
        "graphql",
        "redis",
        "nginx",
        "ci/cd",
        "jest",
        "testing",
        "pandas",
        "ml",
        "machine learning",
        "nlp",
        "system design",
    ]

    for k in keyword_skills:
        if k in jd_low and k not in candidates:
            candidates.append(k)

    # Normalize + de-dupe
    seen = set()
    out: list[str] = []
    for c in candidates:
        n = _normalize_skill(c)
        if n and n not in seen:
            seen.add(n)
            out.append(n)
    return out


def _extract_present_skills(resume_text: str, target_skills: list[str]) -> set[str]:
    txt = resume_text.lower()
    present: set[str] = set()
    for s in target_skills:
        if s and s in txt:
            present.add(s)
    return present


def _ats_score(resume_text: str) -> dict[str, Any]:
    # Very rough heuristic scoring to approximate ATS friendliness.
    # Penalize missing basics.
    t = resume_text.strip().lower()
    length = len(t)

    has_summary = bool(re.search(r"\bsummary\b|\bprofile\b", t))
    has_experience = bool(re.search(r"\bexperience\b|\bwork history\b", t))
    has_skills_section = bool(re.search(r"\bskills\b", t))
    has_bullets = bool(re.search(r"•|\n[-*]\s+", resume_text))
    has_contact = bool(re.search(r"\bemail\b|@\w+\.\w+", t) or re.search(r"\b\d{3}[-.]\d{3}[-.]\d{4}\b", t))

    # Keyword density
    word_count = max(1, len(re.findall(r"\w+", t)))
    python_mentions = t.count("python")
    react_mentions = t.count("react")

    keyword_boost = min(15, int((python_mentions + react_mentions) / max(1, word_count / 200) * 5))

    score = 20
    score += 15 if has_summary else 0
    score += 15 if has_experience else 0
    score += 20 if has_skills_section else 0
    score += 10 if has_bullets else 0
    score += 10 if has_contact else 0
    score += keyword_boost

    # Length normalization
    if length < 600:
        score -= 10
    elif length > 6000:
        score -= 5

    score = max(0, min(100, score))

    return {
        "score": score,
        "signals": {
            "has_summary": has_summary,
            "has_experience": has_experience,
            "has_skills_section": has_skills_section,
            "has_bullets": has_bullets,
            "has_contact": has_contact,
            "keyword_boost": keyword_boost,
        },
    }


def _grammar_suggestions(resume_text: str) -> list[dict[str, str]]:
    # Simple rule-based checks:
    # - double spaces
    # - common passive/weak phrasing
    # - missing punctuation after sentences
    # - repeated words (very naive)
    t = resume_text.strip()
    suggestions: list[dict[str, str]] = []

    if "  " in t:
        suggestions.append({
            "type": "formatting",
            "issue": "Double spaces detected",
            "suggestion": "Remove extra spaces to improve readability and parsing.",
        })

    # Detect "managed" + passive-ish without strong verbs isn't reliable.
    # We'll propose replacing weak starters.
    weak_starters = [
        (r"\bresponsible for\b", "Led / Developed"),
        (r"\bworked on\b", "Built / Delivered"),
        (r"\bhelped\b", "Delivered"),
        (r"\butilized\b", "Used"),
    ]

    for pat, repl in weak_starters:
        if re.search(pat, t, flags=re.IGNORECASE):
            suggestions.append({
                "type": "wording",
                "issue": f"Uses weak phrase matching: '{pat}'",
                "suggestion": f"Consider replacing with: '{repl}'.",
            })

    # Capitalization of “i”
    if re.search(r"\bi\b(?!\w)", t):
        # This is too broad; look for lowercase standalone i in mid-sentence.
        if re.search(r"\s[i]\s", t):
            suggestions.append({
                "type": "grammar",
                "issue": "Lowercase 'i' detected",
                "suggestion": "Use 'I' when referring to yourself.",
            })

    # Repeated consecutive words
    for m in re.finditer(r"\b(\w+)\s+\1\b", t, flags=re.IGNORECASE):
        word = m.group(1)
        suggestions.append({
            "type": "grammar",
            "issue": f"Repeated word: '{word}'",
            "suggestion": "Remove one occurrence to tighten the sentence.",
        })
        break

    return suggestions[:6]


def _stronger_wording(resume_text: str) -> list[dict[str, str]]:
    # Suggest stronger action verbs and phrase upgrades.
    t = resume_text
    upgrades: list[dict[str, str]] = []

    # Common weak verbs
    pairs = [
        (r"\bdeveloped\b", "Designed and built"),
        (r"\bworked\b", "Delivered"),
        (r"\bimproved\b", "Optimized"),
        (r"\bhelped\b", "Drove"),
        (r"\bresponsible for\b", "Owned"),
    ]

    for pat, repl in pairs:
        if re.search(pat, t, flags=re.IGNORECASE):
            upgrades.append({
                "original_pattern": pat,
                "suggested_rewrite": repl,
            })

    # Add a template-driven suggestion
    upgrades.append({
        "original_pattern": "Impact metrics",
        "suggested_rewrite": "Add measurable outcomes (%, $, latency, scale) to each bullet.",
    })

    return upgrades[:6]


@dataclass
class AnalysisResult:
    ats_score: dict[str, Any]
    missing_skills: list[str]
    grammar_suggestions: list[dict[str, str]]
    stronger_wording: list[dict[str, str]]
    summary: str


def analyze_resume_pdf(uploaded_pdf, job_description: str | None = None, target_skills: list[str] | None = None):
    resume_text = _extract_pdf_text(uploaded_pdf)

    # Determine target skills
    targets: list[str] = []
    if target_skills:
        targets = [_normalize_skill(s) for s in target_skills]
    elif job_description:
        targets = _extract_target_skills_from_job(job_description)
    else:
        # default set for demo
        targets = ["python", "fastapi", "react", "javascript", "sql", "docker", "aws", "rest"]

    present = _extract_present_skills(resume_text, targets)
    missing = [s for s in targets if s not in present]

    ats = _ats_score(resume_text)
    grammar = _grammar_suggestions(resume_text)
    wording = _stronger_wording(resume_text)

    missing_preview = ", ".join(missing[:8]) if missing else "None detected"
    summary = (
        f"ATS score: {ats['score']}/100. "
        f"Missing skills (top matches): {missing_preview}. "
        f"Provided grammar and stronger wording suggestions to improve clarity and impact."
    )

    result = AnalysisResult(
        ats_score=ats,
        missing_skills=missing[:20],
        grammar_suggestions=grammar,
        stronger_wording=wording,
        summary=summary,
    )

    return {
        "ats_score": result.ats_score,
        "missing_skills": result.missing_skills,
        "grammar_suggestions": result.grammar_suggestions,
        "stronger_wording": result.stronger_wording,
        "summary": result.summary,
    }

