import type { AnalyzeResponse } from './types'

const VITE_API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:8000'

export async function analyzeResume(input: {
  file: File
  jobDescription?: string
  targetSkills?: string
}): Promise<AnalyzeResponse> {
  const form = new FormData()
  form.append('file', input.file)
  if (input.jobDescription) form.append('job_description', input.jobDescription)
  if (input.targetSkills) form.append('target_skills', input.targetSkills)

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

