export type AnalyzeResponse = {
  ats_score: {
    score: number
    signals: {
      has_summary: boolean
      has_experience: boolean
      has_skills_section: boolean
      has_bullets: boolean
      has_contact: boolean
      keyword_boost: number
    }
  }

  resume_match: number
  matched_skills: string[]
  missing_skills: string[]

  grammar_suggestions: Array<{
    type: string
    issue: string
    suggestion: string
  }>

  stronger_wording: Array<{
    original_pattern?: string
    suggested_rewrite: string
  }>

  summary: string

  rewritten_resume: string
  ai_suggestions?: string[]
}

export type InterviewQuestionsResponse = {
  categories: Array<{
    title: string
    questions: Array<{
      question: string
      answer: string
    }>
  }>
}

export type InterviewEvaluationResponse = {
  score: number
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  better_sample_answer: string
}