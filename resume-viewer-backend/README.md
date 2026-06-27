# AI Resume Viewer - Backend (FastAPI)

## Setup
1. Install Python 3.10+.
2. Create venv and install deps:
   ```bat
   cd resume-viewer-backend
   py -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```

## Run
```bat
uvicorn app.main:app --reload --port 8000
```

## API
- `POST /api/analyze` (multipart/form-data)
  - `file`: PDF resume (`UploadFile`)
  - `job_description` (optional): text
  - `target_skills` (optional): comma-separated string

Returns JSON:
- `ats_score` (score + signals)
- `missing_skills` (top missing)
- `grammar_suggestions`
- `stronger_wording`
- `summary`

## Notes
This project uses a local heuristic analyzer (no external LLM required). You can later replace `app/services/analyzer.py` with an LLM-based implementation.

