import type { AnalyzeResponse } from './types'

const VITE_API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:8000'

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

