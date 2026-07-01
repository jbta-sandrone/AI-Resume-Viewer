import type { AnalyzeResponse, InterviewEvaluationResponse, InterviewQuestionsResponse } from './types'

const VITE_API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000").replace(/\/$/, "")

export async function analyzeResume(input: {
  file: File
  jobDescription?: string
  targetSkills?: string
  rewrite?: boolean
}): Promise<AnalyzeResponse> {
  const form = new FormData()
  form.append('file', input.file)
  if (input.jobDescription) form.append('job_description', input.jobDescription)
  if (input.targetSkills) form.append('target_skills', input.targetSkills)
  if (input.rewrite) form.append('rewrite', 'true')

  const res = await fetch(`${VITE_API_BASE_URL}/api/analyze`, {
    method: 'POST',
    body: form
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Backend error (${res.status}): ${text || res.statusText}`)
  }

  return (await res.json()) as AnalyzeResponse
}

export async function generateCoverLetter(input: {
  file: File
  position: string
  jobDescription: string
  companyName?: string
}): Promise<{ cover_letter: string }> {
  const form = new FormData()
  form.append('file', input.file)
  form.append('position', input.position)
  form.append('job_description', input.jobDescription)
  if (input.companyName) form.append('company_name', input.companyName)

  const res = await fetch(`${VITE_API_BASE_URL}/api/cover-letter`, {
    method: 'POST',
    body: form
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Backend error (${res.status}): ${text || res.statusText}`)
  }

  return (await res.json()) as { cover_letter: string }
}

export async function generateInterviewQuestions(input: { file: File }): Promise<InterviewQuestionsResponse> {
  const form = new FormData()
  form.append('file', input.file)

  const res = await fetch(`${VITE_API_BASE_URL}/api/interview-questions`, {
    method: 'POST',
    body: form
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Backend error (${res.status}): ${text || res.statusText}`)
  }

  return (await res.json()) as InterviewQuestionsResponse
}

export async function chatWithResume(input: {
  message: string
  file?: File | null
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
}): Promise<{ reply: string }> {
  const form = new FormData()
  form.append('message', input.message)
  if (input.file) form.append('file', input.file)
  if (input.conversationHistory?.length) {
    form.append('conversation_history', JSON.stringify(input.conversationHistory))
  }

  const res = await fetch(`${VITE_API_BASE_URL}/api/resume-chat`, {
    method: 'POST',
    body: form
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Backend error (${res.status}): ${text || res.statusText}`)
  }

  return (await res.json()) as { reply: string }
}

export async function evaluateInterviewAnswer(input: {
  question: string
  answer: string
}): Promise<InterviewEvaluationResponse> {
  const form = new FormData()
  form.append('question', input.question)
  form.append('answer', input.answer)

  const res = await fetch(`${VITE_API_BASE_URL}/api/interview-evaluate`, {
    method: 'POST',
    body: form
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Backend error (${res.status}): ${text || res.statusText}`)
  }

  return (await res.json()) as InterviewEvaluationResponse
}

