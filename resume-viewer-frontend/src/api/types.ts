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
  missing_skills: string[]
  grammar_suggestions: Array<{ type: string; issue: string; suggestion: string }>
  stronger_wording: Array<{ original_pattern?: string; suggested_rewrite: string }>
  summary: string
}

