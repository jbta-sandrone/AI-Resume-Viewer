import React, { useEffect, useMemo, useState } from 'react'
import { analyzeResume } from './api/client'
import type { AnalyzeResponse } from './api/types'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function scoreLabel(score: number) {
  if (score >= 85) return { label: 'Excellent', color: 'var(--ok)' }
  if (score >= 65) return { label: 'Good', color: 'var(--warn)' }
  return { label: 'Needs improvement', color: 'var(--bad)' }
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function App() {
  const [file, setFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState('')
  const [targetSkills, setTargetSkills] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0)
  const loadingMessages = useMemo(
    () => [
      'Reading your resume...',
      'Calculating ATS score...',
      'Gemini is rewriting your resume...',
      'Preparing recommendations...',
    ],
    []
  )

  const [rewriteStatus, setRewriteStatus] = useState<'idle' | 'rewriting'>('idle')
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')

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

  async function onAnalyze(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setResult(null)

    if (!file) {
      setError('Upload a PDF resume first.')
      return
    }

    setRewriteStatus('rewriting')
    setLoading(true)
    try {
      const res = await analyzeResume({
        file,
        jobDescription: jobDescription.trim() ? jobDescription.trim() : undefined,
        targetSkills: targetSkills.trim() ? targetSkills.trim() : undefined,
      })
      setResult(res)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed'
      setError(msg)
    } finally {
      setLoading(false)
      setRewriteStatus('idle')
    }
  }

  const ats = result?.ats_score.score ?? 0
  const label = scoreLabel(ats)
  const progressWidth = clamp(ats, 0, 100)

  const signals = result?.ats_score.signals
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
    <div className="container">
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

      <div className="header">
        <div className="brand">
          <div className="logo" />
          <div className="titleWrap">
            <h1>AI Resume Viewer</h1>
            <p className="subtitle">
              Upload a PDF resume to get ATS score, missing skills, grammar/formatting suggestions, and stronger wording.
            </p>
          </div>
        </div>

        <div className="topRight">
          <div className="chip">
            <span className="dot" style={{ background: result ? label.color : 'var(--ok)' }} />
            {result ? `ATS: ${ats}/100 · ${label.label}` : 'Ready for analysis'}
          </div>
        </div>
      </div>

      <div className="grid">
        <form className="card" onSubmit={onAnalyze}>
          <div className="cardTitle">Resume upload</div>

          <label className="label">Resume PDF</label>
          <div className="uploadZone" role="button" tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') (e.currentTarget as HTMLDivElement).click()
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

          <button className="button" type="submit" disabled={loading}>
            {loading ? 'Analyzing…' : 'Analyze Resume'}
          </button>

          {error ? <div className="error">{error}</div> : null}
          {result && !error ? <div className="success">Analysis complete. Review the recommendations.</div> : null}
        </form>

        {result ? (
          <div className="card results">
            <div className="cardTitle">ATS snapshot</div>

            <div className="atsGaugeWrap">
              <div className="atsGauge" aria-label={`ATS score ${ats} out of 100`} role="img">
                {(() => {
                  const radius = 44;
                  const circumference = 2 * Math.PI * radius;
                  const dashOffset = circumference * (1 - progressWidth / 100);
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
                <div className="label" style={{ color: label.color }}>{label.label}</div>
                <div className="sub">ATS score is based on detected resume signals and keyword coverage.</div>
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
                        style={{ width: `${clamp(signals?.keyword_boost ?? 0, 0, 15) / 15 * 100}%` }}
                      />
                    </div>
                    <div className="barVal">{signals?.keyword_boost ?? 0}/15</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="section">
              <h3>Missing Skills</h3>
              <div className="muted2">Top matches not detected in the resume</div>
              {missingSkills.length ? (
                <div className="pillRow">
                  {coloredPills.map((p) => (
                    <div className="chipSkill" key={p.text} style={{ borderColor: p.color, background: `linear-gradient(135deg, ${p.color}, rgba(124,58,237,0.04))` }}>
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
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 16 }}>
          <div className="card">
            <div className="cardTitle">Quality checks</div>

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
            <div className="cardTitle">Impact improvements</div>

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
            <div className="cardTitle">Overall summary</div>
            <div className="summary">{result.summary}</div>
          </div>

          <div className="card" style={{ gridColumn: '1 / -1' }}>
            <div className="cardTitle">🟣 Gemini AI Resume Rewrite</div>

            <div className="rewriteTopRow">
              <div className="rewriteStatus">
                {rewriteStatus === 'rewriting' ? (
                  <span className="rewriteStatusText">Gemini is rewriting your resume…</span>
                ) : (
                  <span className="rewriteStatusText">Get a stronger, ATS-friendly version.</span>
                )}
              </div>
              <div className="rewriteActions">
                <button
                  type="button"
                  className="buttonSmall"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(result.rewritten_resume)
                      setCopyState('copied')
                    } catch {
                      // Fallback: select+copy is hard in textarea; ignore.
                    }
                  }}
                  disabled={loading}
                >
                  {copyState === 'copied' ? 'Copied!' : 'Copy'}
                </button>

                <button
                  type="button"
                  className="buttonSmall"
                  onClick={() => downloadText('ai-resume-rewrite.txt', result.rewritten_resume)}
                  disabled={loading}
                >
                  Download .txt
                </button>
              </div>
            </div>

            <textarea
              className="textarea rewriteTextarea"
              value={result.rewritten_resume}
              readOnly
              rows={10}
            />
          </div>

        </div>
      ) : null}
    </div>
  )
}


