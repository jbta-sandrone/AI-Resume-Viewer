import React, { useMemo, useState } from 'react'
import { analyzeResume } from './api/client'
import type { AnalyzeResponse } from './api/types'

export default function App() {
  const [file, setFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState('')
  const [targetSkills, setTargetSkills] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const missingSkillsText = useMemo(() => {
    if (!result) return ''
    return result.missing_skills.length ? result.missing_skills.join(', ') : 'None detected'
  }, [result])

  async function onAnalyze(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)

    if (!file) {
      setError('Upload a PDF resume first.')
      return
    }

    setLoading(true)
    try {
      const res = await analyzeResume({
        file,
        jobDescription: jobDescription.trim() ? jobDescription.trim() : undefined,
        targetSkills: targetSkills.trim() ? targetSkills.trim() : undefined
      })
      setResult(res)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>AI Resume Viewer</h1>
      <p className="subtitle">
        Upload a PDF resume and get ATS score + missing skills + grammar and wording suggestions.
      </p>

      <form className="card" onSubmit={onAnalyze}>
        <label className="label">Resume PDF</label>
        <input
          className="input"
          type="file"
          accept="application/pdf"
          onChange={(ev) => setFile(ev.target.files?.[0] ?? null)}
        />

        <label className="label">Job description (optional)</label>
        <textarea
          className="textarea"
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the job post here to improve missing skills detection."
        />

        <label className="label">Target skills (optional)</label>
        <input
          className="input"
          value={targetSkills}
          onChange={(e) => setTargetSkills(e.target.value)}
          placeholder="e.g. react, fastapi, python, sql"
        />

        <button className="button" type="submit" disabled={loading}>
          {loading ? 'Analyzing…' : 'Analyze Resume'}
        </button>

        {error ? <div className="error">{error}</div> : null}
      </form>

      {result ? (
        <div className="card results">
          <h2>Results</h2>
          <div className="row">
            <div className="metric">
              <div className="metric-label">ATS Score</div>
              <div className="metric-value">{result.ats_score.score}/100</div>
            </div>
            <div className="metric">
              <div className="metric-label">Signals</div>
              <ul className="list">
                <li>Summary: {String(result.ats_score.signals.has_summary)}</li>
                <li>Experience: {String(result.ats_score.signals.has_experience)}</li>
                <li>Skills section: {String(result.ats_score.signals.has_skills_section)}</li>
                <li>Bullets: {String(result.ats_score.signals.has_bullets)}</li>
                <li>Contact: {String(result.ats_score.signals.has_contact)}</li>
              </ul>
            </div>
          </div>

          <div className="section">
            <h3>Missing Skills</h3>
            <div className="muted">Top matches not detected in the resume</div>
            <div className="pillwrap">
              {missingSkillsText}
            </div>
          </div>

          <div className="section">
            <h3>Grammar / Formatting Suggestions</h3>
            {result.grammar_suggestions.length ? (
              <ul className="list">
                {result.grammar_suggestions.map((s, idx) => (
                  <li key={idx}>
                    <b>{s.type}:</b> {s.issue} <br />
                    <span className="muted">Suggestion: {s.suggestion}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="muted">No issues detected by basic rules.</div>
            )}
          </div>

          <div className="section">
            <h3>Stronger Wording</h3>
            {result.stronger_wording.length ? (
              <ul className="list">
                {result.stronger_wording.map((w, idx) => (
                  <li key={idx}>
                    {w.original_pattern ? <span className="muted">Original: {w.original_pattern}</span> : null}
                    <div>
                      <b>Rewrite:</b> {w.suggested_rewrite}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="muted">No stronger wording suggestions detected.</div>
            )}
          </div>

          <div className="section">
            <h3>Summary</h3>
            <div className="summary">{result.summary}</div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

