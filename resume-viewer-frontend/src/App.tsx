import React, { useEffect, useMemo, useState } from 'react'
import { analyzeResume, generateCoverLetter } from './api/client'
import type { AnalyzeResponse } from './api/types'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function scoreLabel(score: number) {
  if (score >= 85) return { label: 'Excellent', color: 'var(--ok)' }
  if (score >= 65) return { label: 'Good', color: 'var(--warn)' }
  return { label: 'Needs improvement', color: 'var(--bad)' }
}

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function downloadPdf(_filename: string, content: string, title = 'AI Resume Rewrite') {
  const safeContent = escapeHtml(content ?? '')
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; padding: 24px; white-space: pre-wrap; line-height: 1.5; }
      .wrap { font-size: 12.5px; }
      @media print { body { padding: 0.4in; } }
    </style>
  </head>
  <body>
    <div class="wrap">${safeContent}</div>
  </body>
</html>`

  const win = window.open('about:blank', '_blank')
  if (!win) {
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = _filename.replace(/\.pdf$/i, '.html')
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return
  }

  win.document.open()
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 200)
}

type Mode = 'analyzer' | 'rewriter' | 'coverLetter'

export default function App() {
  const [activeMode, setActiveMode] = useState<Mode>('analyzer')

  const [file, setFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState('')
  const [targetSkills, setTargetSkills] = useState('')

  const [rewriteFile, setRewriteFile] = useState<File | null>(null)
  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null)
  const [coverLetterPosition, setCoverLetterPosition] = useState('')
  const [coverLetterJobDescription, setCoverLetterJobDescription] = useState('')
  const [coverLetterCompanyName, setCoverLetterCompanyName] = useState('')
  const [coverLetterOutput, setCoverLetterOutput] = useState('')

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)
  const loadingMessages = useMemo(() => {
    if (activeMode === 'coverLetter') {
      return [
        '📝 Extracting your resume text...',
        '🎯 Tailoring the letter to the role...',
        '✦ Gemini is composing your cover letter...',
      ]
    }

    return [
      '📑 Reading your resume...',
      activeMode === 'analyzer' ? '🎯 Calculating ATS score...' : '✦ Preparing rewrite...',
      '🛠️ Generating recommendations...',
      '✦ Gemini is rewriting your resume...',
    ]
  }, [activeMode])

  const [rewriteStatus, setRewriteStatus] = useState<'idle' | 'rewriting'>('idle')
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!loading) return
    setLoadingMsgIndex(0)
    const t = window.setInterval(() => {
      setLoadingMsgIndex((i) => (i + 1) % loadingMessages.length)
    }, 2400)
    return () => window.clearInterval(t)
  }, [loading, loadingMessages.length])

  useEffect(() => {
    if (copyState !== 'copied') return
    const t = window.setTimeout(() => setCopyState('idle'), 1700)
    return () => window.clearTimeout(t)
  }, [copyState])

  const missingSkills = useMemo(() => {
    if (!result) return [] as string[]
    return result.missing_skills ?? []
  }, [result])

  function switchMode(nextMode: Mode) {
    setActiveMode(nextMode)
    setError(null)
    setCopyState('idle')
    setResult(null)
    setCoverLetterOutput('')
    setMobileMenuOpen(false)
  }

  function clearAnalyzerState() {
    setFile(null)
    setJobDescription('')
    setTargetSkills('')
    setResult(null)
    setError(null)
    setCopyState('idle')
    setLoading(false)
  }

  function clearRewriterState() {
    setRewriteFile(null)
    setResult(null)
    setError(null)
    setRewriteStatus('idle')
    setCopyState('idle')
    setLoading(false)
  }

  function clearCoverLetterState() {
    setCoverLetterFile(null)
    setCoverLetterPosition('')
    setCoverLetterJobDescription('')
    setCoverLetterCompanyName('')
    setCoverLetterOutput('')
    setError(null)
    setCopyState('idle')
    setLoading(false)
  }

  async function onAnalyze(e: React.FormEvent) {
    e.preventDefault()

    if (activeMode !== 'analyzer') return

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
        targetSkills: targetSkills.trim() ? targetSkills.trim() : undefined,
      })
      setResult({ ...res, rewritten_resume: '' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function onRewrite() {
    if (activeMode !== 'rewriter') return

    setError(null)
    setResult(null)

    if (!rewriteFile) {
      setError('Upload a PDF resume first.')
      return
    }

    setRewriteStatus('rewriting')
    setLoading(true)
    try {
      const res = await analyzeResume({ file: rewriteFile, rewrite: true })
      setResult(res)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Rewrite failed'
      setError(msg)
    } finally {
      setLoading(false)
      setRewriteStatus('idle')
    }
  }

  async function requestCoverLetterGeneration() {
    if (activeMode !== 'coverLetter') return

    setError(null)
    setCoverLetterOutput('')

    if (!coverLetterFile) {
      setError('Upload a PDF resume first.')
      return
    }

    if (!coverLetterPosition.trim()) {
      setError('Enter the position title.')
      return
    }

    if (!coverLetterJobDescription.trim()) {
      setError('Paste the job description.')
      return
    }

    setLoading(true)
    try {
      const res = await generateCoverLetter({
        file: coverLetterFile,
        position: coverLetterPosition.trim(),
        jobDescription: coverLetterJobDescription.trim(),
        companyName: coverLetterCompanyName.trim() || undefined,
      })
      setCoverLetterOutput(res.cover_letter ?? '')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Cover letter generation failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function onGenerateCoverLetter(e: React.FormEvent) {
    e.preventDefault()
    await requestCoverLetterGeneration()
  }

  async function onRegenerateCoverLetter() {
    await requestCoverLetterGeneration()
  }

  const ats = result?.ats_score.score ?? 0
  const label = scoreLabel(ats)
  const progressWidth = clamp(ats, 0, 100)
  const hasRewriteText = Boolean(result?.rewritten_resume?.trim())
  const hasCoverLetterText = Boolean(coverLetterOutput.trim())

  const signals = result?.ats_score.signals
  const aiSuggestions = result?.ai_suggestions ?? []
  const coloredPills = missingSkills.map((s, i) => ({
    text: s,
    color:
      i % 4 === 0
        ? 'rgba(34,211,238,0.22)'
        : i % 4 === 1
          ? 'rgba(167,139,250,0.22)'
          : i % 4 === 2
            ? 'rgba(52,211,153,0.22)'
            : 'rgba(251,191,36,0.22)',
  }))

  return (
    <div className="appShell">
      {loading ? (
        <div className="loadingOverlay" aria-live="polite">
          <div className="loadingCard">
            <div className="spinner" aria-hidden="true">
              <div className="spinnerInner" />
            </div>
            <div className="loadingText">{loadingMessages[loadingMsgIndex]}</div>
          </div>
        </div>
      ) : null}

      {mobileMenuOpen && (
        <div className="sidebarOverlay" onClick={() => setMobileMenuOpen(false)} />
      )}
      <aside className={`sidebar ${mobileMenuOpen ? 'mobileOpen' : ''}`} aria-label="Resume tools">
        <div className="sidebarTop">
          <div className="sidebarLogo">
            <span className="sidebarLogoText">AR</span>
          </div>
          <div className="sidebarTitle">AI Resume Suite</div>
        </div>

        <nav className="sidebarNav">
          <button
            type="button"
            className={`sidebarItem ${activeMode === 'analyzer' ? 'active' : ''}`}
            onClick={() => switchMode('analyzer')}
          >
            <span className="sidebarIcon">📑</span>
            <span className="sidebarItemText">Resume Analyzer</span>
          </button>

          <button
            type="button"
            className={`sidebarItem ${activeMode === 'rewriter' ? 'active' : ''}`}
            onClick={() => switchMode('rewriter')}
          >
            <span className="sidebarIcon">✦</span>
            <span className="sidebarItemText">Resume Rewriter</span>
          </button>

          <button
            type="button"
            className={`sidebarItem ${activeMode === 'coverLetter' ? 'active' : ''}`}
            onClick={() => switchMode('coverLetter')}
          >
            <span className="sidebarIcon">✉️</span>
            <span className="sidebarItemText">Cover Letter </span>
          </button>
        </nav>

        <div className="sidebarFooter">
          <div className="sidebarHintTitle">Mode behavior</div>
          <div className="sidebarHintText">Only the active feature is enabled.</div>
        </div>
      </aside>

      <main className="mainPane">
        <div className="header">
          <div className="brand">
            <div className="logo" />
            <div className="titleWrap">
              <h1>AI Resume Viewer</h1>
              <p className="subtitle">
                {activeMode === 'analyzer'
                  ? 'Upload a PDF resume to get ATS score, missing skills, grammar/formatting suggestions, and stronger wording.'
                  : activeMode === 'rewriter'
                    ? 'Upload a PDF resume and generate a stronger, ATS-friendly rewrite.'
                    : 'Create a tailored cover letter from your resume and a specific job description.'}
              </p>
            </div>
          </div>
          <button
            className="hamburger"
            onClick={() => setMobileMenuOpen(prev => !prev)}
            aria-label="Toggle navigation menu"
          >
            <span className="hamburgerLine" />
            <span className="hamburgerLine" />
            <span className="hamburgerLine" />
          </button>

          <div className="topRight">
            <div className="chip">
              <span className="dot" style={{ background: result && activeMode === 'analyzer' ? label.color : 'var(--ok)' }} />
              {result
                ? activeMode === 'analyzer'
                  ? `ATS: ${ats}/100 · ${label.label}`
                  : 'Rewrite ready'
                : activeMode === 'analyzer'
                  ? 'Ready for analysis'
                  : activeMode === 'rewriter'
                    ? 'Ready to rewrite'
                    : 'Ready for cover letter'}
            </div>
          </div>
        </div>

        {activeMode === 'analyzer' ? (
          <>
            <div className="grid">
              <form className="card" onSubmit={onAnalyze}>
                <div className="cardTitle">📑 Resume upload</div>

                <label className="label">Resume PDF</label>
                <div
                  className="uploadZone"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      ; (e.currentTarget as HTMLDivElement).click()
                    }
                  }}
                >
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(ev) => setFile(ev.target.files?.[0] ?? null)}
                  />
                  <div className="uploadIcon">⤒</div>
                  <div className="uploadText">Upload file</div>
                  <div className="uploadSub">or drag & drop</div>
                  {file ? <div className="uploadFileName">{file.name}</div> : null}
                </div>

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

                <div className="rewriteActions" style={{ marginTop: 12 }}>
                  <button className="button" type="submit" disabled={loading}>
                    {loading ? 'Analyzing…' : 'Analyze Resume'}
                  </button>
                  <button className="buttonSmall" type="button" onClick={clearAnalyzerState} disabled={loading}>
                    Clear All
                  </button>
                </div>

                {error ? <div className="error">{error}</div> : null}
                {result && !error ? (
                  <div className="success">Analysis complete. Review the recommendations.</div>
                ) : null}
              </form>

              {result ? (
                <div className="card results">
                  <div className="cardTitle">📊 ATS snapshot</div>

                  <div className="atsGaugeWrap">
                    <div className="atsGauge" aria-label={`ATS score ${ats} out of 100`} role="img">
                      {(() => {
                        const radius = 44
                        const circumference = 2 * Math.PI * radius
                        const dashOffset = circumference * (1 - progressWidth / 100)
                        return (
                          <svg width="108" height="108" viewBox="0 0 108 108">
                            <circle
                              className="atsGaugeTrack"
                              cx="54"
                              cy="54"
                              r={radius}
                              strokeWidth="10"
                              fill="none"
                            />
                            <circle
                              className="atsGaugeBar"
                              cx="54"
                              cy="54"
                              r={radius}
                              strokeWidth="10"
                              fill="none"
                              stroke="rgba(124,58,237,0.95)"
                              strokeDasharray={circumference}
                              strokeDashoffset={dashOffset}
                              style={{ transformOrigin: '54px 54px' }}
                            />
                          </svg>
                        )
                      })()}
                      <div className="atsGaugeCenter">
                        <div>
                          <div className="val">{ats}</div>
                          <div className="unit">/100</div>
                        </div>
                      </div>
                    </div>

                    <div className="atsGaugeMeta">
                      <div className="label" style={{ color: label.color }}>
                        {label.label}
                      </div>
                      <div className="sub">ATS score is based on detected resume signals and keyword coverage.</div>
                    </div>

                    <div style={{ marginTop: 16 }}>
                      <div className="chartTitle">Resume Match</div>

                      <div className="barTrack">
                        <div
                          className="barFill"
                          style={{ width: `${result.resume_match}%` }}
                        />
                      </div>

                      <div className="barVal">
                        {result.resume_match}%
                      </div>
                    </div>
                  </div>

                  <div className="section">
                    <h3>Signals</h3>
                    <div className="muted2">Detected resume structure/keyword signals</div>

                    <div className="signalGrid">
                      {(
                        [
                          { key: 'has_summary', name: 'Summary', ico: '✦' },
                          { key: 'has_experience', name: 'Experience', ico: '⟡' },
                          { key: 'has_skills_section', name: 'Skills section', ico: '⌁' },
                          { key: 'has_bullets', name: 'Bullet formatting', ico: '•' },
                          { key: 'has_contact', name: 'Contact info', ico: '@' },
                        ] as const
                      ).map((s) => {
                        const ok = Boolean((signals as any)?.[s.key])
                        return (
                          <div key={s.key} className="signal">
                            <div className="signalLeft">
                              <div className="badge" aria-hidden="true">
                                {s.ico}
                              </div>
                              <div className="signalName">{s.name}</div>
                            </div>
                            <div className="signalState">
                              <span className={`stateDot ${ok ? 'ok' : 'bad'}`} />
                              {ok ? 'Present' : 'Missing'}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="section">
                    <div className="chart">
                      <div className="chartTitle">Keyword boost</div>
                      <div className="chartRow">
                        <div className="miniBar">
                          <div className="miniLabel">Boost</div>
                          <div className="barTrack">
                            <div
                              className="barFill"
                              style={{ width: `${(clamp(signals?.keyword_boost ?? 0, 0, 15) / 15) * 100}%` }}
                            />
                          </div>
                          <div className="barVal">{signals?.keyword_boost ?? 0}/15</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="section">
                    <h3>Matched Skills</h3>

                    <div className="muted2">
                      Skills detected in your resume
                    </div>

                    {result.matched_skills.length ? (
                      <div className="pillRow">
                        {result.matched_skills.map((skill) => (
                          <div
                            key={skill}
                            className="chipSkill"
                            style={{
                              borderColor: '#22c55e',
                              background: 'linear-gradient(135deg,#22c55e22,#22c55e10)',
                            }}
                          >
                            {skill}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="muted">
                        None detected
                      </div>
                    )}
                  </div>

                  <div className="section">
                    <h3>Missing Skills</h3>
                    <div className="muted2">Top matches not detected in the resume</div>
                    {missingSkills.length ? (
                      <div className="pillRow">
                        {coloredPills.map((p) => (
                          <div
                            className="chipSkill"
                            key={p.text}
                            style={{
                              borderColor: 'rgba(248, 113, 113, 0.75)',
                              background: 'linear-gradient(135deg, rgba(248, 113, 113, 0.18), rgba(124,58,237,0.04))',
                            }}
                          >
                            {p.text}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="muted" style={{ marginTop: 10 }}>
                        None detected
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {result ? (
              <div className="grid columns2" style={{ marginTop: 16 }}>
                <div className="card">
                  <div className="cardTitle">✔️ Quality checks</div>

                  <div className="section" style={{ marginTop: 0 }}>
                    <h3>Grammar / Formatting Suggestions</h3>
                    {result.grammar_suggestions.length ? (
                      <ul className="list">
                        {result.grammar_suggestions.map((s, idx) => (
                          <li key={idx}>
                            <b>{s.type}:</b> {s.issue}
                            <br />
                            <span className="muted">Suggestion: {s.suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="muted">No issues detected by basic rules.</div>
                    )}
                  </div>
                </div>

                <div className="card">
                  <div className="cardTitle">💡 Impact improvements</div>

                  <div className="section" style={{ marginTop: 0 }}>
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
                </div>

                <div className="card" style={{ gridColumn: '1 / -1' }}>
                  <div className="cardTitle">📜 Overall summary</div>
                  <div className="summary">{result.summary}</div>
                </div>
              </div>
            ) : null}
          </>
        ) : activeMode === 'rewriter' ? (
          <div className="grid columns2" style={{ marginTop: 0, gap: 16 }}>
            <form className="card" onSubmit={(e) => e.preventDefault()}>
              <div className="cardTitle">✦ Rewrite setup</div>

              <label className="label">Resume PDF</label>
              <div className="uploadZone" role="button" tabIndex={0}>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(ev) => setRewriteFile(ev.target.files?.[0] ?? null)}
                />
                <div className="uploadIcon">⤒</div>
                <div className="uploadText">Upload file</div>
                <div className="uploadSub">or drag & drop</div>
                {rewriteFile ? <div className="uploadFileName">{rewriteFile.name}</div> : null}
              </div>

              <div className="rewriteActions" style={{ marginTop: 12 }}>
                <button type="button" className="button" onClick={onRewrite} disabled={loading}>
                  {loading ? 'Rewriting…' : 'Rewrite Resume'}
                </button>
                <button type="button" className="buttonSmall" onClick={clearRewriterState} disabled={loading}>
                  Clear All
                </button>
              </div>

              {error ? <div className="error">{error}</div> : null}
              {hasRewriteText && !error ? <div className="success">Rewrite complete.</div> : null}
            </form>

            {hasRewriteText ? (
              <div className="card rewriteCard">
                <div className="cardTitle">✦ Gemini AI Resume Rewrite</div>

                <div className="rewriteTopRow">
                  <div className="rewriteStatus">
                    {rewriteStatus === 'rewriting' ? (
                      <span className="rewriteStatusText">Gemini is rewriting your resume…</span>
                    ) : (
                      <span className="rewriteStatusText">Stronger, ATS-friendly version.</span>
                    )}
                  </div>
                  <div className="rewriteActions">
                    <button
                      type="button"
                      className="buttonSmall"
                      onClick={async () => {
                        const text = result!.rewritten_resume ?? ''

                        try {
                          await navigator.clipboard.writeText(text)
                          setCopyState('copied')
                          return
                        } catch {
                          // ignore
                        }

                        const ta = document.querySelector('textarea.rewriteTextarea') as HTMLTextAreaElement | null
                        if (!ta) return

                        ta.focus()
                        ta.select()

                        try {
                          const ok = document.execCommand('copy')
                          if (ok) setCopyState('copied')
                        } catch {
                          // ignore
                        } finally {
                          ta.setSelectionRange(0, 0)
                        }
                      }}
                      disabled={loading}
                    >
                      {copyState === 'copied' ? 'Copied!' : 'Copy'}
                    </button>

                    <button
                      type="button"
                      className="buttonSmall"
                      onClick={() => downloadPdf('ai-resume-rewrite.pdf', result!.rewritten_resume)}
                      disabled={loading}
                    >
                      Download PDF
                    </button>
                  </div>
                </div>

                <textarea
                  className="textarea rewriteTextarea"
                  value={result!.rewritten_resume}
                  readOnly
                  rows={14}
                />

                {aiSuggestions.length ? (
                  <div className="section" style={{ marginTop: 18, listStyleType: 'none', paddingLeft: 0 }}>
                    <h3>AI Suggestions</h3>
                    <ul className="list">
                      {aiSuggestions.map((suggestion, idx) => (
                        <li key={idx}> {suggestion}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid columns2" style={{ marginTop: 0, gap: 16 }}>
            <form className="card" onSubmit={onGenerateCoverLetter}>
              <div className="cardTitle">✉️ Cover letter generator</div>

              <label className="label">Resume PDF</label>
              <div className="uploadZone" role="button" tabIndex={0}>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(ev) => setCoverLetterFile(ev.target.files?.[0] ?? null)}
                />
                <div className="uploadIcon">⤒</div>
                <div className="uploadText">Upload file</div>
                <div className="uploadSub">or drag & drop</div>
                {coverLetterFile ? <div className="uploadFileName">{coverLetterFile.name}</div> : null}
              </div>

              <label className="label">Position</label>
              <input
                className="input"
                value={coverLetterPosition}
                onChange={(e) => setCoverLetterPosition(e.target.value)}
                placeholder="Frontend Developer"
              />

              <label className="label">Job description</label>
              <textarea
                className="textarea"
                value={coverLetterJobDescription}
                onChange={(e) => setCoverLetterJobDescription(e.target.value)}
                placeholder="Paste the full job description here."
              />

              <label className="label">Company name (optional)</label>
              <input
                className="input"
                value={coverLetterCompanyName}
                onChange={(e) => setCoverLetterCompanyName(e.target.value)}
                placeholder="Google, Accenture, Microsoft"
              />

              <div className="rewriteActions" style={{ marginTop: 12 }}>
                <button className="button" type="submit" disabled={loading}>
                  {loading ? 'Generating…' : 'Generate Cover Letter'}
                </button>
                <button className="buttonSmall" type="button" onClick={clearCoverLetterState} disabled={loading}>
                  Clear All
                </button>
              </div>

              {error ? <div className="error">{error}</div> : null}
              {hasCoverLetterText && !error ? <div className="success">Cover letter generated.</div> : null}
            </form>

            {hasCoverLetterText ? (
              <div className="card">
                <div className="cardTitle">✉️ Generated cover letter</div>

                <div className="rewriteTopRow">
                  <div className="rewriteStatus">
                    <span className="rewriteStatusText">Professional, ATS-friendly draft.</span>
                  </div>
                  <div className="rewriteActions">
                    <button
                      type="button"
                      className="buttonSmall"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(coverLetterOutput)
                          setCopyState('copied')
                          return
                        } catch {
                          // ignore
                        }

                        const ta = document.querySelector('textarea.coverLetterTextarea') as HTMLTextAreaElement | null
                        if (!ta) return

                        ta.focus()
                        ta.select()

                        try {
                          const ok = document.execCommand('copy')
                          if (ok) setCopyState('copied')
                        } catch {
                          // ignore
                        } finally {
                          ta.setSelectionRange(0, 0)
                        }
                      }}
                      disabled={loading}
                    >
                      {copyState === 'copied' ? 'Copied!' : 'Copy'}
                    </button>

                    <button
                      type="button"
                      className="buttonSmall"
                      onClick={() => downloadPdf('Cover_Letter.pdf', coverLetterOutput, 'Cover Letter')}
                      disabled={loading || !coverLetterOutput.trim()}
                    >
                      Download PDF
                    </button>

                    <button
                      type="button"
                      className="buttonSmall"
                      onClick={onRegenerateCoverLetter}
                      disabled={loading}
                    >
                      Regenerate
                    </button>

                  </div>
                </div>

                <textarea
                  className="textarea rewriteTextarea coverLetterTextarea"
                  value={coverLetterOutput}
                  readOnly
                  rows={16}
                />
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  )
}

