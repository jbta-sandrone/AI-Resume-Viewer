# AI Resume Viewer - Backend (FastAPI)

## Requirements

- Python 3.11+
- pip

---

## Setup

### 1. Navigate to the backend

```bash
cd resume-viewer-backend
```

### 2. Create a virtual environment

```bash
python -m venv venv
```

### 3. Activate the virtual environment

**Windows (PowerShell)**

```powershell
.\venv\Scripts\Activate
```

**Windows (Command Prompt)**

```cmd
venv\Scripts\activate
```

---

### 4. Install dependencies

```bash
pip install -r requirements.txt
```

---

### 5. Configure Environment Variables

Create a `.env` file inside the backend directory.

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

---

### 6. Run the development server

```bash
uvicorn app.main:app --reload
```

The backend will run on:

```
http://localhost:8000
```

API documentation is available at:

```
http://localhost:8000/docs
```

---

## Project Structure

```text
resume-viewer-backend/
│
├── app/
│   ├── routes/
│   ├── services/
│   ├── main.py
│   └── ...
│
├── requirements.txt
├── runtime.txt
├── .env
└── README.md
```

---

## Tech Stack

- Python
- FastAPI
- Google Gemini API
- PDFPlumber
- NLTK
- Pydantic

---

## Features

- Resume Analysis
- ATS Scoring
- Resume Rewrite
- Cover Letter Generation
- AI Resume Chat
- Interview Question Generation
- Mock Interview Evaluation
- REST API Architecture

---

## Deployment

This backend is designed to be deployed on **Render**.

Required environment variable:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```
