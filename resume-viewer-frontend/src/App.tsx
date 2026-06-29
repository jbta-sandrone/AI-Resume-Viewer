import React, { useEffect, useMemo, useRef, useState } from 'react'
import { analyzeResume, generateCoverLetter, evaluateInterviewAnswer, generateInterviewQuestions } from './api/client'
import type { AnalyzeResponse, InterviewEvaluationResponse, InterviewQuestionsResponse } from './api/types'

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

type Mode = 'analyzer' | 'rewriter' | 'coverLetter' | 'interview'

function resetFileInput(inputRef: React.MutableRefObject<HTMLInputElement | null>) {
  if (inputRef.current) {
    inputRef.current.value = ''
  }
}

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

  const [interviewFile, setInterviewFile] = useState<File | null>(null)
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestionsResponse | null>(null)
  const [mockInterviewStarted, setMockInterviewStarted] = useState(false)
  const [mockInterviewCompleted, setMockInterviewCompleted] = useState(false)
  const [mockInterviewQuestionIndex, setMockInterviewQuestionIndex] = useState(0)
  const [mockInterviewAnswer, setMockInterviewAnswer] = useState('')
  const [mockInterviewEvaluation, setMockInterviewEvaluation] = useState<InterviewEvaluationResponse | null>(null)
  const [mockInterviewResults, setMockInterviewResults] = useState<Array<{
    question: string
    category: string
    score: number
    strengths: string[]
    weaknesses: string[]
    suggestions: string[]
    betterSampleAnswer: string
  }>>([])
  const [mockInterviewLoading, setMockInterviewLoading] = useState(false)
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({})

  const analyzerInputRef = useRef<HTMLInputElement | null>(null)
  const rewriteInputRef = useRef<HTMLInputElement | null>(null)
  const coverLetterInputRef = useRef<HTMLInputElement | null>(null)
  const interviewInputRef = useRef<HTMLInputElement | null>(null)

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

    if (activeMode === 'interview') {
      return [
        '🧠 Analyzing your resume...',
        '🎯 Mapping your strengths and gaps...',
        '❓ Crafting personalized interview questions...',
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
    setInterviewQuestions(null)
    setFile(null)
    setRewriteFile(null)
    setCoverLetterFile(null)
    setInterviewFile(null)
    resetFileInput(analyzerInputRef)
    resetFileInput(rewriteInputRef)
    resetFileInput(coverLetterInputRef)
    resetFileInput(interviewInputRef)
    setMockInterviewStarted(false)
    setMockInterviewCompleted(false)
    setMockInterviewQuestionIndex(0)
    setMockInterviewAnswer('')
    setMockInterviewEvaluation(null)
    setMockInterviewResults([])
    setMockInterviewLoading(false)
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
    resetFileInput(analyzerInputRef)
  }

  function clearRewriterState() {
    setRewriteFile(null)
    setResult(null)
    setError(null)
    setRewriteStatus('idle')
    setCopyState('idle')
    setLoading(false)
    resetFileInput(rewriteInputRef)
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
    resetFileInput(coverLetterInputRef)
  }

  function clearInterviewState() {
    setInterviewFile(null)
    setInterviewQuestions(null)
    setMockInterviewStarted(false)
    setMockInterviewCompleted(false)
    setMockInterviewQuestionIndex(0)
    setMockInterviewAnswer('')
    setMockInterviewEvaluation(null)
    setMockInterviewResults([])
    setMockInterviewLoading(false)
    setRevealedAnswers({})
    setError(null)
    setCopyState('idle')
    setLoading(false)
    resetFileInput(interviewInputRef)
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

  async function requestInterviewQuestionsGeneration() {
    if (activeMode !== 'interview') return

    setError(null)
    setInterviewQuestions(null)

    if (!interviewFile) {
      setError('Upload a PDF resume first.')
      return
    }

    setLoading(true)
    try {
      const res = await generateInterviewQuestions({ file: interviewFile })
      setInterviewQuestions(res)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Interview question generation failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function onGenerateInterviewQuestions(e: React.FormEvent) {
    e.preventDefault()
    await requestInterviewQuestionsGeneration()
  }

  async function onRegenerateInterviewQuestions() {
    setMockInterviewStarted(false)
    setMockInterviewCompleted(false)
    setMockInterviewQuestionIndex(0)
    setMockInterviewAnswer('')
    setMockInterviewEvaluation(null)
    setMockInterviewResults([])
    setMockInterviewLoading(false)
    await requestInterviewQuestionsGeneration()
  }

  async function onSubmitInterviewAnswer(e: React.FormEvent) {
    e.preventDefault()
    if (!currentInterviewQuestion) return

    const cleanedAnswer = mockInterviewAnswer.trim()
    if (!cleanedAnswer) {
      setError('Type your answer before submitting.')
      return
    }

    setError(null)
    setMockInterviewLoading(true)
    try {
      const evaluation = await evaluateInterviewAnswer({
        question: currentInterviewQuestion.question,
        answer: cleanedAnswer,
      })

      setMockInterviewEvaluation(evaluation)
      setMockInterviewResults((prev) => [
        ...prev,
        {
          question: currentInterviewQuestion.question,
          category: currentInterviewQuestion.category,
          score: evaluation.score,
          strengths: evaluation.strengths,
          weaknesses: evaluation.weaknesses,
          suggestions: evaluation.suggestions,
          betterSampleAnswer: evaluation.better_sample_answer,
        },
      ])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Interview evaluation failed'
      setError(msg)
    } finally {
      setMockInterviewLoading(false)
    }
  }

  function startMockInterview() {
    if (!interviewQuestionBank.length) return
    setMockInterviewStarted(true)
    setMockInterviewCompleted(false)
    setMockInterviewQuestionIndex(0)
    setMockInterviewAnswer('')
    setMockInterviewEvaluation(null)
    setMockInterviewResults([])
    setError(null)
  }

  function toggleAnswerReveal(questionKey: string) {
    setRevealedAnswers((prev) => ({
      ...prev,
      [questionKey]: !prev[questionKey],
    }))
  }

  function goToNextInterviewQuestion() {
    if (!currentInterviewQuestion) return

    if (mockInterviewQuestionIndex + 1 >= interviewQuestionBank.length) {
      setMockInterviewCompleted(true)
      setMockInterviewAnswer('')
      setMockInterviewEvaluation(null)
      return
    }

    setMockInterviewQuestionIndex((value) => value + 1)
    setMockInterviewAnswer('')
    setMockInterviewEvaluation(null)
    setError(null)
  }

  const ats = result?.ats_score.score ?? 0
  const label = scoreLabel(ats)
  const progressWidth = clamp(ats, 0, 100)
  const hasRewriteText = Boolean(result?.rewritten_resume?.trim())
  const hasCoverLetterText = Boolean(coverLetterOutput.trim())
  const hasInterviewQuestions = Boolean(interviewQuestions?.categories?.some((category) => category.questions?.length))

  const interviewQuestionBank = useMemo(() => {
    if (!interviewQuestions?.categories?.length) return [] as Array<{ category: string; question: string; answer: string }>

    return interviewQuestions.categories.flatMap((category) =>
      (category.questions ?? []).map((question) => ({
        category: category.title,
        question: question.question,
        answer: question.answer,
      }))
    )
  }, [interviewQuestions])

  const currentInterviewQuestion = interviewQuestionBank[mockInterviewQuestionIndex] ?? null
  const interviewProgressLabel = interviewQuestionBank.length
    ? `${mockInterviewQuestionIndex + 1} / ${interviewQuestionBank.length}`
    : '0 / 0'

  const interviewSummary = useMemo(() => {
    if (!mockInterviewResults.length) {
      return {
        averageScore: 0,
        strongestArea: 'N/A',
        weakestArea: 'N/A',
        feedback: 'Complete the mock interview to receive a summary.',
        recommendations: ['Answer each question clearly and include a concrete example.'],
      }
    }

    const averageScore = Math.round(
      mockInterviewResults.reduce((sum, item) => sum + item.score, 0) / mockInterviewResults.length
    )

    const categoryScores = mockInterviewResults.reduce<Record<string, { total: number; count: number }>>((acc, item) => {
      const entry = acc[item.category] ?? { total: 0, count: 0 }
      entry.total += item.score
      entry.count += 1
      acc[item.category] = entry
      return acc
    }, {})

    const strongestArea = Object.entries(categoryScores).sort((a, b) => {
      const avgA = a[1].total / a[1].count
      const avgB = b[1].total / b[1].count
      return avgB - avgA
    })[0]?.[0] ?? 'General'

    const weakestArea = Object.entries(categoryScores).sort((a, b) => {
      const avgA = a[1].total / a[1].count
      const avgB = b[1].total / b[1].count
      return avgA - avgB
    })[0]?.[0] ?? 'General'

    const recommendations = mockInterviewResults.flatMap((item) => item.suggestions).slice(0, 4)
    const feedback = averageScore >= 8
      ? 'You answered with strong clarity and confidence. Keep practicing to make each response more structured and concise.'
      : averageScore >= 6
        ? 'Your answers were solid and showed good potential. Focus on adding more concrete examples and clearer structure.'
        : 'Your responses show room to grow. Emphasize clearer structure, stronger examples, and more confident phrasing.'

    return {
      averageScore,
      strongestArea,
      weakestArea,
      feedback,
      recommendations: recommendations.length ? recommendations : ['Use the STAR method to structure your answers.'],
    }
  }, [mockInterviewResults])

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
            <span className="sidebarIcon">🖊️</span>
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

          <button
            type="button"
            className={`sidebarItem ${activeMode === 'interview' ? 'active' : ''}`}
            onClick={() => switchMode('interview')}
          >
            <span className="sidebarIcon">💬</span>
            <span className="sidebarItemText">Interview Question</span>
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
                    : activeMode === 'coverLetter'
                      ? 'Create a tailored cover letter from your resume and a specific job description.'
                      : 'Upload a PDF resume to generate personalized interview questions and sample answers.'}
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
                    : activeMode === 'coverLetter'
                      ? 'Ready for cover letter'
                      : 'Ready for interview prep'}
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
                    ref={analyzerInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={(ev) => {
                      setFile(ev.target.files?.[0] ?? null)
                      resetFileInput(analyzerInputRef)
                    }}
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
                  ref={rewriteInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={(ev) => {
                    setRewriteFile(ev.target.files?.[0] ?? null)
                    resetFileInput(rewriteInputRef)
                  }}
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
        ) : activeMode === 'interview' ? (
          <div className="grid columns2" style={{ marginTop: 0, gap: 16 }}>
            <form className="card" onSubmit={onGenerateInterviewQuestions}>
              <div className="cardTitle">💬 AI Interview Questions</div>

              <label className="label">Resume PDF</label>
              <div className="uploadZone" role="button" tabIndex={0}>
                <input
                  ref={interviewInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={(ev) => {
                    setInterviewFile(ev.target.files?.[0] ?? null)
                    resetFileInput(interviewInputRef)
                  }}
                />
                <div className="uploadIcon">⤒</div>
                <div className="uploadText">Upload file</div>
                <div className="uploadSub">or drag & drop</div>
                {interviewFile ? <div className="uploadFileName">{interviewFile.name}</div> : null}
              </div>

              <div className="rewriteActions" style={{ marginTop: 12 }}>
                <button className="button" type="submit" disabled={loading || !interviewFile}>
                  {loading ? 'Generating…' : 'Generate Interview Questions'}
                </button>
                <button className="buttonSmall" type="button" onClick={clearInterviewState} disabled={loading}>
                  Clear All
                </button>
              </div>

              {error ? <div className="error">{error}</div> : null}
              {hasInterviewQuestions && !error ? <div className="success">Interview questions generated.</div> : null}
            </form>

            {hasInterviewQuestions ? (
              <div className="card">
                <div className="cardTitle">🎤 Interview prep</div>

                <div className="rewriteTopRow">
                  <div className="rewriteStatus">
                    <span className="rewriteStatusText">
                      {mockInterviewCompleted
                        ? 'Interview complete. Review your summary and next steps.'
                        : mockInterviewStarted
                          ? `Question ${interviewProgressLabel}`
                          : 'Personalized questions tailored to your resume.'}
                    </span>
                  </div>
                  <div className="rewriteActions">
                    <button
                      type="button"
                      className="buttonSmall"
                      onClick={onRegenerateInterviewQuestions}
                      disabled={loading}
                    >
                      Regenerate Questions
                    </button>
                  </div>
                </div>

                <div className="section" style={{ marginTop: 18 }}>
                  <h3>Generated Interview Questions</h3>
                  <div className="muted2" style={{ marginBottom: 12 }}>
                    Review the personalized questions and sample answers below, then practice them with the mock interview tool.
                  </div>

                  {interviewQuestions?.categories?.map((category, categoryIndex) => (
                    <div key={`${category.title}-${categoryIndex}`} style={{ marginBottom: 18 }}>
                      <h3 style={{ fontSize: 16, marginBottom: 8 }}>{category.title}</h3>
                      {category.questions.map((item, questionIndex) => {
                        const questionKey = `${categoryIndex}-${questionIndex}`
                        const isRevealed = Boolean(revealedAnswers[questionKey])

                        return (
                          <div
                            key={questionKey}
                            style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                              <div style={{ fontWeight: 7, flex: 1 }}>
                                {questionIndex + 1}. {item.question}
                              </div>
                              <button
                                type="button"
                                className="buttonSmall"
                                onClick={() => toggleAnswerReveal(questionKey)}
                                aria-expanded={isRevealed}
                                aria-label={isRevealed ? 'Hide sample answer' : 'Reveal sample answer'}
                                style={{ whiteSpace: 'nowrap' }}
                              >
                                {isRevealed ? '🙈 Hide' : '👁 Reveal'}
                              </button>
                            </div>

                            <div
                              style={{
                                maxHeight: isRevealed ? 220 : 0,
                                opacity: isRevealed ? 1 : 0,
                                overflow: 'hidden',
                                transition: 'max-height 220ms ease, opacity 220ms ease',
                              }}
                            >
                              <div style={{ fontWeight: 600, marginBottom: 4 }}>Sample Answer</div>
                              <div className="muted2">{item.answer}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>

                <div className="section" style={{ marginTop: 18 }}>
                  <div className="card" style={{ padding: 16, background: 'rgba(255,255,255,0.04)' }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Mock Interview Practice</div>
                    <div className="muted2" style={{ marginBottom: 10 }}>
                      Answer one question at a time and receive AI feedback, strengths, weaknesses, and a stronger sample answer.
                    </div>
                    {!mockInterviewStarted && !mockInterviewCompleted ? (
                      <button type="button" className="button" onClick={startMockInterview} disabled={!interviewQuestionBank.length}>
                        Start Mock Interview
                      </button>
                    ) : null}
                  </div>
                </div>

                {mockInterviewCompleted ? (
                  <div className="section" style={{ marginTop: 18 }}>
                    <h3>Interview Summary</h3>
                    <div className="muted2" style={{ marginBottom: 12 }}>
                      Review your overall performance and the strongest themes to improve.
                    </div>

                    <div className="card" style={{ background: 'rgba(255,255,255,0.04)', padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                        <div>
                          <div className="muted2">Overall average score</div>
                          <div style={{ fontSize: 28, fontWeight: 800 }}>{interviewSummary.averageScore}/10</div>
                        </div>
                        <div>
                          <div className="muted2">Strongest area</div>
                          <div style={{ fontWeight: 700 }}>{interviewSummary.strongestArea}</div>
                        </div>
                        <div>
                          <div className="muted2">Weakest area</div>
                          <div style={{ fontWeight: 700 }}>{interviewSummary.weakestArea}</div>
                        </div>
                      </div>

                      <div style={{ marginTop: 12 }}>
                        <div className="muted2" style={{ marginBottom: 6 }}>Overall feedback</div>
                        <div>{interviewSummary.feedback}</div>
                      </div>

                      <div style={{ marginTop: 12 }}>
                        <div className="muted2" style={{ marginBottom: 6 }}>Top recommendations</div>
                        <ul className="list">
                          {interviewSummary.recommendations.map((item, idx) => (
                            <li key={`${item}-${idx}`}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="rewriteActions" style={{ marginTop: 14 }}>
                      <button type="button" className="button" onClick={startMockInterview}>
                        Restart Interview
                      </button>
                      <button type="button" className="buttonSmall" onClick={onRegenerateInterviewQuestions}>
                        Regenerate Questions
                      </button>
                      <button type="button" className="buttonSmall" onClick={clearInterviewState}>
                        Clear All
                      </button>
                    </div>
                  </div>
                ) : mockInterviewStarted ? (
                  <form className="section" style={{ marginTop: 18 }} onSubmit={onSubmitInterviewAnswer}>
                    <h3>Practice Question</h3>
                    <div style={{ fontWeight: 700, marginBottom: 10 }}>
                      {currentInterviewQuestion?.question}
                    </div>
                    <div className="muted2" style={{ marginBottom: 12 }}>
                      Category: {currentInterviewQuestion?.category}
                    </div>

                    <label className="label">Your answer</label>
                    <textarea
                      className="textarea"
                      value={mockInterviewAnswer}
                      onChange={(e) => setMockInterviewAnswer(e.target.value)}
                      placeholder="Type your answer here as if you were responding in an interview."
                      rows={8}
                    />

                    <div className="rewriteActions" style={{ marginTop: 12 }}>
                      <button className="button" type="submit" disabled={mockInterviewLoading || !mockInterviewAnswer.trim()}>
                        {mockInterviewLoading ? 'Evaluating…' : 'Submit Answer'}
                      </button>
                    </div>

                    {mockInterviewEvaluation ? (
                      <div className="card" style={{ marginTop: 16, padding: 16, background: 'rgba(255,255,255,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <div>
                            <div className="muted2">Score</div>
                            <div style={{ fontSize: 28, fontWeight: 800 }}>{mockInterviewEvaluation.score}/10</div>
                          </div>
                          <div style={{ fontWeight: 700 }}>
                            {mockInterviewEvaluation.score >= 8 ? 'Strong response' : mockInterviewEvaluation.score >= 6 ? 'Solid response' : 'Needs more structure'}
                          </div>
                        </div>

                        <div style={{ marginTop: 12 }}>
                          <div className="muted2" style={{ marginBottom: 6 }}>Strengths</div>
                          <ul className="list">
                            {mockInterviewEvaluation.strengths.map((item, idx) => (
                              <li key={`strength-${idx}`}>{item}</li>
                            ))}
                          </ul>
                        </div>

                        <div style={{ marginTop: 12 }}>
                          <div className="muted2" style={{ marginBottom: 6 }}>Weaknesses</div>
                          <ul className="list">
                            {mockInterviewEvaluation.weaknesses.map((item, idx) => (
                              <li key={`weakness-${idx}`}>{item}</li>
                            ))}
                          </ul>
                        </div>

                        <div style={{ marginTop: 12 }}>
                          <div className="muted2" style={{ marginBottom: 6 }}>Suggestions for improvement</div>
                          <ul className="list">
                            {mockInterviewEvaluation.suggestions.map((item, idx) => (
                              <li key={`suggestion-${idx}`}>{item}</li>
                            ))}
                          </ul>
                        </div>

                        <div style={{ marginTop: 12 }}>
                          <div className="muted2" style={{ marginBottom: 6 }}>Better sample answer</div>
                          <div>{mockInterviewEvaluation.better_sample_answer}</div>
                        </div>

                        <div className="rewriteActions" style={{ marginTop: 14 }}>
                          <button type="button" className="button" onClick={goToNextInterviewQuestion}>
                            {mockInterviewQuestionIndex + 1 >= interviewQuestionBank.length ? 'View Summary' : 'Next Question'}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </form>
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
                  ref={coverLetterInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={(ev) => {
                    setCoverLetterFile(ev.target.files?.[0] ?? null)
                    resetFileInput(coverLetterInputRef)
                  }}
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

