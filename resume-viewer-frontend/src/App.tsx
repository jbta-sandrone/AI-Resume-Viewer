import React, { useEffect, useMemo, useRef, useState } from 'react'
import { analyzeResume, generateCoverLetter, evaluateInterviewAnswer, generateInterviewQuestions, chatWithResume } from './api/client'
import type { AnalyzeResponse, InterviewEvaluationResponse, InterviewQuestionsResponse } from './api/types'
import { QUIZ_CATEGORIES, QUIZ_DIFFICULTIES, getQuizQuestions, type QuizCategory, type QuizDifficulty, type ResumeQuizQuestion } from './quizQuestions'
import ResumeSections from './resume-section'
import ATSGuide from './atsguide'
import ProjectSkill from './projectskill'
import FreshGraduate from './freshgraduate'
import InterviewTips from './interviewtips'

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

type Mode = 'chat' | 'analyzer' | 'coverLetter' | 'resumeQuiz' | 'learningHub'

type LearningHubCategory = {
  key: string
  icon: string
  title: string
  description: string
}

const LEARNING_HUB_CATEGORIES: LearningHubCategory[] = [
  {
    key: 'resume-sections',
    icon: '📄',
    title: 'Resume Sections',
    description: 'Learn the purpose and structure of every section in a professional resume.',
  },
  {
    key: 'ats-guide',
    icon: '🤖',
    title: 'ATS Guide',
    description: 'Understand how Applicant Tracking Systems scan and evaluate resumes.',
  },
  {
    key: 'projects-skills',
    icon: '💼',
    title: 'Projects & Skills',
    description: 'Learn how to present your projects and technical skills effectively.',
  },
  {
    key: 'fresh-graduate',
    icon: '🎓',
    title: 'Fresh Graduate Guide',
    description: 'Practical advice for students and fresh graduates applying for their first job.',
  },
  {
    key: 'interview-tips',
    icon: '🎤',
    title: 'Interview Tips',
    description: 'Prepare for technical and HR interviews with confidence.',
  },
]

function resetFileInput(inputRef: React.MutableRefObject<HTMLInputElement | null>) {
  if (inputRef.current) {
    inputRef.current.value = ''
  }
}

export default function App() {
  const [activeMode, setActiveMode] = useState<Mode>('chat')

  const [file, setFile] = useState<File | null>(null)
  const [jobDescription, setJobDescription] = useState('')
  const [targetSkills, setTargetSkills] = useState('')

  const [coverLetterFile, setCoverLetterFile] = useState<File | null>(null)
  const [coverLetterPosition, setCoverLetterPosition] = useState('')
  const [coverLetterJobDescription, setCoverLetterJobDescription] = useState('')
  const [coverLetterCompanyName, setCoverLetterCompanyName] = useState('')
  const [coverLetterOutput, setCoverLetterOutput] = useState('')

  const [chatFile, setChatFile] = useState<File | null>(null)
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [copiedMessageKey, setCopiedMessageKey] = useState<string | null>(null)

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
  const [mockInterviewModalOpen, setMockInterviewModalOpen] = useState(false)
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({})

  const [resumeQuizCategory, setResumeQuizCategory] = useState<QuizCategory | null>(null)
  const [resumeQuizDifficulty, setResumeQuizDifficulty] = useState<QuizDifficulty | null>(null)
  const [resumeQuizStarted, setResumeQuizStarted] = useState(false)
  const [resumeQuizQuestions, setResumeQuizQuestions] = useState<ResumeQuizQuestion[]>([])
  const [resumeQuizCurrentIndex, setResumeQuizCurrentIndex] = useState(0)
  const [resumeQuizAnswers, setResumeQuizAnswers] = useState<Record<number, number>>({})
  const [resumeQuizSubmitted, setResumeQuizSubmitted] = useState(false)
  const [resumeQuizScore, setResumeQuizScore] = useState<number | null>(null)
  const [resumeQuizFeedback, setResumeQuizFeedback] = useState<Record<number, string>>({})
  const [learningHubLesson, setLearningHubLesson] = useState<string | null>(null)

  const activeQuizCategoryLabel = QUIZ_CATEGORIES.find((category) => category.key === resumeQuizCategory)?.label ?? 'Not selected'
  const activeQuizDifficultyLabel = QUIZ_DIFFICULTIES.find((difficulty) => difficulty.key === resumeQuizDifficulty)?.label ?? 'Not selected'
  const currentResumeQuizQuestion = resumeQuizQuestions[resumeQuizCurrentIndex]
  const answeredQuizQuestions = Object.keys(resumeQuizAnswers).length
  const hasCurrentAnswer = typeof resumeQuizAnswers[currentResumeQuizQuestion?.id ?? -1] === 'number'

  const analyzerInputRef = useRef<HTMLInputElement | null>(null)
  const coverLetterInputRef = useRef<HTMLInputElement | null>(null)
  const chatInputRef = useRef<HTMLInputElement | null>(null)

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

    if (activeMode === 'chat') {
      return [
        '💬 Preparing your answer...',
        '🧠 Reviewing your resume context...',
        '✦ Crafting practical guidance...',
      ]
    }

    return [
      '📑 Reading your resume...',
      '🎯 Calculating ATS score...',
      '🛠️ Generating recommendations...',
      '✦ Gemini is preparing your full career report...',
    ]
  }, [activeMode])

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

  useEffect(() => {
    if (!copiedMessageKey) return
    const t = window.setTimeout(() => setCopiedMessageKey(null), 1200)
    return () => window.clearTimeout(t)
  }, [copiedMessageKey])

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
    setCoverLetterFile(null)
    resetFileInput(analyzerInputRef)
    resetFileInput(coverLetterInputRef)
    setMockInterviewStarted(false)
    setMockInterviewCompleted(false)
    setMockInterviewQuestionIndex(0)
    setMockInterviewAnswer('')
    setMockInterviewEvaluation(null)
    setMockInterviewResults([])
    setMockInterviewLoading(false)
    setMockInterviewModalOpen(false)
    setRevealedAnswers({})
    setResumeQuizCategory(null)
    setResumeQuizDifficulty(null)
    setResumeQuizStarted(false)
    setResumeQuizQuestions([])
    setResumeQuizCurrentIndex(0)
    setResumeQuizAnswers({})
    setResumeQuizSubmitted(false)
    setResumeQuizScore(null)
    setResumeQuizFeedback({})
    setLearningHubLesson(null)
    setMobileMenuOpen(false)
  }

  function clearAnalyzerState() {
    setFile(null)
    setJobDescription('')
    setTargetSkills('')
    setResult(null)
    setInterviewQuestions(null)
    setMockInterviewStarted(false)
    setMockInterviewCompleted(false)
    setMockInterviewQuestionIndex(0)
    setMockInterviewAnswer('')
    setMockInterviewEvaluation(null)
    setMockInterviewResults([])
    setMockInterviewLoading(false)
    setMockInterviewModalOpen(false)
    setRevealedAnswers({})
    setResumeQuizCategory(null)
    setResumeQuizDifficulty(null)
    setResumeQuizStarted(false)
    setResumeQuizQuestions([])
    setResumeQuizCurrentIndex(0)
    setResumeQuizAnswers({})
    setResumeQuizSubmitted(false)
    setResumeQuizScore(null)
    setResumeQuizFeedback({})
    setError(null)
    setCopyState('idle')
    setLoading(false)
    resetFileInput(analyzerInputRef)
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

  function clearChatState() {
    setChatMessages([])
    setChatInput('')
    setChatError(null)
    setChatLoading(false)
    resetFileInput(chatInputRef)
  }

  function resetResumeQuiz() {
    setResumeQuizCategory(null)
    setResumeQuizDifficulty(null)
    setResumeQuizStarted(false)
    setResumeQuizQuestions([])
    setResumeQuizCurrentIndex(0)
    setResumeQuizAnswers({})
    setResumeQuizSubmitted(false)
    setResumeQuizScore(null)
    setResumeQuizFeedback({})
  }

  function selectResumeQuizOption(questionId: number, optionIndex: number) {
    if (resumeQuizSubmitted) return
    setResumeQuizAnswers((prev) => ({ ...prev, [questionId]: optionIndex }))
  }

  function beginResumeQuiz() {
    if (!resumeQuizCategory || !resumeQuizDifficulty) return
    const questions = getQuizQuestions(resumeQuizCategory, resumeQuizDifficulty)
    setResumeQuizQuestions(questions)
    setResumeQuizStarted(true)
    setResumeQuizCurrentIndex(0)
    setResumeQuizAnswers({})
    setResumeQuizSubmitted(false)
    setResumeQuizScore(null)
    setResumeQuizFeedback({})
  }

  function submitResumeQuiz() {
    if (!resumeQuizStarted || resumeQuizSubmitted) return

    const nextIndex = resumeQuizCurrentIndex + 1
    if (nextIndex < resumeQuizQuestions.length) {
      setResumeQuizCurrentIndex(nextIndex)
      return
    }

    const correctCount = resumeQuizQuestions.reduce((count, question) => {
      return count + (resumeQuizAnswers[question.id] === question.correctOptionIndex ? 1 : 0)
    }, 0)

    const feedback: Record<number, string> = {}
    resumeQuizQuestions.forEach((question) => {
      const chosenIndex = resumeQuizAnswers[question.id]
      feedback[question.id] = chosenIndex === question.correctOptionIndex
        ? 'Correct — ' + question.explanation
        : `Incorrect — ${question.explanation}`
    })

    setResumeQuizScore(correctCount)
    setResumeQuizFeedback(feedback)
    setResumeQuizSubmitted(true)
  }

  function restartResumeQuiz() {
    resetResumeQuiz()
  }

  function getResumeQuizProgress() {
    return `${resumeQuizCurrentIndex + 1} / ${resumeQuizQuestions.length}`
  }

  function getResumeKnowledgeRating(score: number, total: number) {
    const percent = total ? (score / total) * 100 : 0
    if (percent >= 90) return 'Expert' 
    if (percent >= 75) return 'Strong'
    if (percent >= 50) return 'Developing'
    return 'Needs improvement'
  }

  async function copyMessageText(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedMessageKey(key)
    } catch {
      setCopiedMessageKey(null)
    }
  }

  async function sendChatMessage(messageOverride?: string) {
    const message = (messageOverride ?? chatInput).trim()
    if (!message) return

    const historyForRequest = [...chatMessages, { role: 'user' as const, content: message }]

    setChatError(null)
    setChatMessages((prev) => [...prev, { role: 'user', content: message }])
    setChatInput('')
    setChatLoading(true)

    try {
      const res = await chatWithResume({
        message,
        file: chatFile,
        conversationHistory: historyForRequest.map((item) => ({ role: item.role, content: item.content })),
      })
      setChatMessages((prev) => [...prev, { role: 'assistant', content: res.reply }])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Chat request failed'
      setChatError(msg)
      setChatMessages((prev) => [...prev, {
        role: 'assistant',
        content: "I couldn't respond right now. Please try again in a moment.",
      }])
    } finally {
      setChatLoading(false)
    }
  }

  async function runAnalyzerFlow() {
    setError(null)
    setResult(null)
    setInterviewQuestions(null)
    setMockInterviewStarted(false)
    setMockInterviewCompleted(false)
    setMockInterviewQuestionIndex(0)
    setMockInterviewAnswer('')
    setMockInterviewEvaluation(null)
    setMockInterviewResults([])
    setMockInterviewLoading(false)
    setMockInterviewModalOpen(false)
    setRevealedAnswers({})

    if (!file) {
      setError('Upload a PDF resume first.')
      return
    }

    setLoading(true)
    try {
      const analysis = await analyzeResume({
        file,
        jobDescription: jobDescription.trim() ? jobDescription.trim() : undefined,
        targetSkills: targetSkills.trim() ? targetSkills.trim() : undefined,
        rewrite: true,
      })
      setResult(analysis)

      const questions = await generateInterviewQuestions({ file })
      setInterviewQuestions(questions)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Analysis failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function onAnalyze(e: React.FormEvent) {
    e.preventDefault()
    if (activeMode !== 'analyzer') return
    await runAnalyzerFlow()
  }

  async function onRegenerateAnalyzer() {
    if (activeMode !== 'analyzer') return
    await runAnalyzerFlow()
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
    setMockInterviewModalOpen(true)
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
  const hasAnalyzerResults = Boolean(result || hasRewriteText || hasInterviewQuestions)

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
  const currentLearningHubCategory = LEARNING_HUB_CATEGORIES.find((category) => category.key === learningHubLesson) ?? null
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
            <span className="sidebarLogoText">NW</span>
          </div>
          <div className="sidebarTitle">NelWorks</div>
        </div>

        <nav className="sidebarNav">
          <button
            type="button"
            className={`sidebarItem ${activeMode === 'chat' ? 'active' : ''}`}
            onClick={() => switchMode('chat')}
          >
            <span className="sidebarIcon">🤖</span>
            <span className="sidebarItemText">AI Resume Chat</span>
          </button>

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
            className={`sidebarItem ${activeMode === 'coverLetter' ? 'active' : ''}`}
            onClick={() => switchMode('coverLetter')}
          >
            <span className="sidebarIcon">✉️</span>
            <span className="sidebarItemText">Cover Letter</span>
          </button>

          <button
            type="button"
            className={`sidebarItem ${activeMode === 'resumeQuiz' ? 'active' : ''}`}
            onClick={() => switchMode('resumeQuiz')}
          >
            <span className="sidebarIcon">🧠</span>
            <span className="sidebarItemText">Resume Quiz</span>
          </button>

          <button
            type="button"
            className={`sidebarItem ${activeMode === 'learningHub' ? 'active' : ''}`}
            onClick={() => switchMode('learningHub')}
          >
            <span className="sidebarIcon">📚</span>
            <span className="sidebarItemText">Learning Hub</span>
          </button>
        </nav>

        <div className="sidebarFooter">
        
        </div>
      </aside>

      <main className="mainPane">
        <div className="header">
          <div className="brand">
            <div className="" />
            <div className="titleWrap">
              <h1>NelWorks - AI Career Assistant</h1>
              <p className="subtitle">
                {activeMode === 'chat'
                  ? 'Chat with an AI assistant for resume, career, ATS, cover letter, and interview guidance.'
                  : activeMode === 'analyzer'
                    ? 'Upload a PDF resume to generate a complete AI career report with analysis, rewrite, and interview questions.'
                    : activeMode === 'resumeQuiz'
                      ? 'Test your resume knowledge with a structured quiz of common resume best practices.'
                      : activeMode === 'learningHub'
                        ? 'Learn the fundamentals of creating professional resumes and preparing for your career through structured learning guides.'
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
                  : 'Cover letter ready'
                : activeMode === 'chat'
                  ? 'Ready for chat'
                  : activeMode === 'analyzer'
                    ? 'Ready for analysis'
                    : activeMode === 'resumeQuiz'
                      ? 'Ready for the resume quiz'
                      : activeMode === 'learningHub'
                        ? 'Ready for learning'
                        : 'Ready for cover letter'}
            </div>
          </div>
        </div>

        {activeMode === 'chat' ? (
          <div className="grid columns2" style={{ marginTop: 0, gap: 16 }}>
            <div className="card" style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', minHeight: 620 }}>
              <div className="cardTitle">🤖 AI Resume Chat</div>
              <div className="muted2" style={{ marginBottom: 14 }}>
                Ask for resume advice, ATS help, cover letters, interview prep, and career guidance. You can chat with or without uploading a resume.
              </div>

              <div className="uploadZone" role="button" tabIndex={0} style={{ marginBottom: 14 }}>
                <input
                  ref={chatInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={(ev) => {
                    setChatFile(ev.target.files?.[0] ?? null)
                    resetFileInput(chatInputRef)
                  }}
                />
                <div className="uploadIcon">⤒</div>
                <div className="uploadText">Upload resume PDF</div>
                <div className="uploadSub">optional context for more tailored answers</div>
                {chatFile ? <div className="uploadFileName">{chatFile.name}</div> : null}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {[
                  'Improve my resume',
                  'Rewrite my summary',
                  'Make my projects stronger',
                  'What skills am I missing?',
                  'Make my resume ATS-friendly',
                  'Prepare me for interviews',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="buttonSmall"
                    onClick={() => sendChatMessage(prompt)}
                    disabled={chatLoading}
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div style={{ flex: 1, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 14, background: 'rgba(255,255,255,0.03)', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {chatMessages.length === 0 && !chatLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <div
                        style={{
                          maxWidth: '82%',
                          padding: '12px 14px',
                          borderRadius: 16,
                          background: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.55,
                        }}
                      >
                        Hi! I’m your AI Resume Assistant.

I can help you improve your resume, make it ATS-friendly, rewrite your summary or projects, suggest missing skills, prepare for interviews, and guide you through job applications.

You can upload a resume for personalized feedback, or just ask a resume-related question to get started.
                      </div>
                    </div>
                  ) : null}

                  {chatMessages.map((message, index) => {
                    const messageKey = `${message.role}-${index}`
                    return (
                      <div
                        key={messageKey}
                        style={{
                          display: 'flex',
                          justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, maxWidth: '82%' }}>
                          <div
                            style={{
                              padding: '12px 14px',
                              borderRadius: 16,
                              background: message.role === 'user' ? 'linear-gradient(135deg, rgba(34,211,238,0.24), rgba(124,58,237,0.22))' : 'rgba(255,255,255,0.07)',
                              border: message.role === 'user' ? '1px solid rgba(34,211,238,0.18)' : '1px solid rgba(255,255,255,0.08)',
                              whiteSpace: 'pre-wrap',
                              lineHeight: 1.55,
                            }}
                          >
                            {message.content}
                          </div>
                          <button
                            type="button"
                            className="buttonSmall"
                            onClick={() => void copyMessageText(message.content, messageKey)}
                            style={{ whiteSpace: 'nowrap', padding: '6px 8px' }}
                          >
                            {copiedMessageKey === messageKey ? '🗸' : '📑'}
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  {chatLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <div style={{ padding: '12px 14px', borderRadius: 16, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="muted2">Thinking…</div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {chatError ? <div className="error" style={{ marginTop: 12 }}>{chatError}</div> : null}

              <div className="rewriteActions" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                  <input
                    className="input"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        void sendChatMessage()
                      }
                    }}
                    placeholder="Ask anything about your resume, career, or job search..."
                    disabled={chatLoading}
                    style={{ padding: 14 }}
                  />
                  <button
                    type="button"
                    className="buttonSmall"
                    onClick={() => void sendChatMessage()}
                    disabled={chatLoading || !chatInput.trim()}
                    style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', padding: '2px 10px', color: 'black', background: 'white', fontSize: 18 }}
                    aria-label="Send message"
                  >
                    {chatLoading ? '…' : '➔'}
                  </button>
                </div>
                <button className="buttonSmall" type="button" onClick={clearChatState} disabled={chatLoading}>
                  Clear Chat
                </button>
              </div>
            </div>
          </div>
        ) : activeMode === 'analyzer' ? (
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
                              stroke="rgba(11, 241, 245, 0.95)"
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

            {result ? (
              <div className="grid columns2" style={{ marginTop: 16 }}>
                <div className="card" style={{ gridColumn: '1 / -1' }}>
                  <div className="cardTitle">✦ AI Resume Rewrite</div>

                  <div className="rewriteTopRow">
                    <div className="rewriteStatus">
                      <span className="rewriteStatusText">Stronger, ATS-friendly version.</span>
                    </div>
                    <div className="rewriteActions">
                      <button
                        type="button"
                        className="buttonSmall"
                        onClick={async () => {
                          const text = result.rewritten_resume ?? ''

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
                        onClick={() => downloadPdf('ai-resume-rewrite.pdf', result.rewritten_resume ?? '')}
                        disabled={loading}
                      >
                        Download PDF
                      </button>
                    </div>
                  </div>

                  <textarea
                    className="textarea rewriteTextarea"
                    value={result.rewritten_resume ?? ''}
                    readOnly
                    rows={14}
                  />

                  {aiSuggestions.length ? (
                    <div className="section" style={{ marginTop: 18, listStyleType: 'none', paddingLeft: 0 }}>
                      <h3>AI Suggestions</h3>
                      <ul className="list">
                        {aiSuggestions.map((suggestion, idx) => (
                          <li key={idx}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                <div className="card" style={{ gridColumn: '1 / -1' }}>
                  <div className="cardTitle">💬 AI Interview Questions</div>

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
                        onClick={onRegenerateAnalyzer}
                        disabled={loading}
                      >
                        Regenerate
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
                                <div style={{ fontWeight: 700, flex: 1 }}>
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

                  {mockInterviewCompleted && !mockInterviewModalOpen ? (
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
                        <button type="button" className="buttonSmall" onClick={onRegenerateAnalyzer}>
                          Regenerate Questions
                        </button>
                        <button type="button" className="buttonSmall" onClick={clearAnalyzerState}>
                          Clear All
                        </button>
                      </div>
                    </div>
                  ) : mockInterviewStarted && !mockInterviewModalOpen ? (
                    <div className="section" style={{ marginTop: 18 }}>
                      <div className="card" style={{ padding: 16, background: 'rgba(255,255,255,0.04)' }}>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>Mock interview practice is ready</div>
                        <div className="muted2" style={{ marginBottom: 10 }}>
                          Continue your interview practice in a focused modal view.
                        </div>
                        <button type="button" className="button" onClick={() => setMockInterviewModalOpen(true)}>
                          Resume Mock Interview
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        ) : activeMode === 'resumeQuiz' ? (
          <div className="resumeQuizLayout">
            <div className="card resumeQuizMainCard">
              <div className="cardTitle">🧠 Resume Quiz</div>
              <div className="muted2" style={{ marginBottom: 14 }}>
                Answer resume best-practice questions locally. Pick a category and difficulty, then submit each answer to progress.
              </div>

              {!resumeQuizStarted ? (
                <div className="resumeQuizSetupStack">
                  <div className="">
                    <div className="muted2">Select a category</div>
                    <div className="resumeQuizChoiceGrid resumeQuizChoiceGrid--categories">
                      {QUIZ_CATEGORIES.map((category) => {
                        const isActive = resumeQuizCategory === category.key
                        return (
                          <button
                            key={category.key}
                            type="button"
                            className={`resumeQuizOptionCard buttonSmall ${isActive ? 'active' : ''}`}
                            onClick={() => setResumeQuizCategory(category.key)}
                          >
                            <div className="resumeQuizOptionTitle">{category.label}</div>
                            <div className="resumeQuizOptionHint">
                              {category.key === 'mixed' ? 'Mixed difficulty mix' : 'Focused practice'}
                            </div>
                            {isActive ? <span className="resumeQuizOptionCheck">✓</span> : null}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="">
                    <div className="muted2">Select a difficulty</div>
                    <div className="resumeQuizChoiceGrid resumeQuizChoiceGrid--difficulty">
                      {QUIZ_DIFFICULTIES.map((difficulty) => {
                        const isActive = resumeQuizDifficulty === difficulty.key
                        
                        return (
                          <button
                            key={difficulty.key}
                            type="button"
                            className={`resumeQuizOptionCard buttonSmall ${isActive ? 'active' : ''}`}
                            onClick={() => setResumeQuizDifficulty(difficulty.key)}
                          >
                            <div className="resumeQuizOptionTitle">{difficulty.label}</div>
                          
                            {isActive ? <span className="resumeQuizOptionCheck">✓</span> : null}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="rewriteActions" style={{ marginTop: 8, flexWrap: 'wrap' }}>
                    <button
                      className="button"
                      type="button"
                      onClick={beginResumeQuiz}
                      disabled={!resumeQuizCategory || !resumeQuizDifficulty}
                    >
                      Begin Quiz
                    </button>
                    <button className="buttonSmall" type="button" onClick={resetResumeQuiz}>
                      Clear All
                    </button>
                  </div>
                </div>
              ) : (
                <div className="resumeQuizFlow">
                  <div className="resumeQuizQuestionHeader">
                    <div>
                      <div className="muted2">Question {getResumeQuizProgress()}</div>
                      <div className="resumeQuizQuestionText">{currentResumeQuizQuestion?.question}</div>
                    </div>
                  </div>

                  <div className="resumeQuizOptionList">
                    {currentResumeQuizQuestion?.options.map((option, optionIndex) => {
                      const selected = resumeQuizAnswers[currentResumeQuizQuestion.id] === optionIndex
                      return (
                        <button
                          key={option}
                          type="button"
                          className={`resumeQuizOptionCard buttonSmall ${selected ? 'active' : ''}`}
                          onClick={() => selectResumeQuizOption(currentResumeQuizQuestion.id, optionIndex)}
                        >
                          <span className="resumeQuizOptionLetter">{String.fromCharCode(65 + optionIndex)}</span>
                          <span className="resumeQuizOptionLabel">{option}</span>
                          {selected ? <span className="resumeQuizOptionCheck">✓</span> : null}
                        </button>
                      )
                    })}
                  </div>

                  <div className="rewriteActions" style={{ marginTop: 16, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="button"
                      onClick={resumeQuizSubmitted ? restartResumeQuiz : submitResumeQuiz}
                      disabled={!resumeQuizSubmitted && (!hasCurrentAnswer || resumeQuizSubmitted)}
                    >
                      {resumeQuizSubmitted ? 'Restart Quiz' : resumeQuizCurrentIndex < resumeQuizQuestions.length - 1 ? 'Submit Answer' : 'Finish Quiz'}
                    </button>
                  </div>

                  {resumeQuizSubmitted ? (
                    <div className="">
                      <div className="resumeQuizResultsHeader">
                        <div>
                          <div className="muted2">Your score</div>
                          <div className="resumeQuizScore">{resumeQuizScore}/{resumeQuizQuestions.length}</div>
                        </div>
                        <div className="resumeQuizRating">{getResumeKnowledgeRating(resumeQuizScore ?? 0, resumeQuizQuestions.length)}</div>
                      </div>

                      <div style={{ marginTop: 12 }}>
                        <ul className="list">
                          {resumeQuizQuestions.map((question) => {
                            const answerIndex = resumeQuizAnswers[question.id]
                            const label = answerIndex != null ? String.fromCharCode(65 + answerIndex) : '—'
                            return (
                              <li key={question.id} style={{ marginBottom: 14 }}>
                                <div><strong>{question.question}</strong></div>
                                <div className="muted2" style={{ margin: '4px 0' }}>
                                  Your answer: {label}. {question.options[answerIndex ?? 0] ?? 'No answer selected'}
                                </div>
                                <div className="muted2">
                                  {resumeQuizFeedback[question.id]}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="card resumeQuizInfoCard">
              <div className="cardTitle">Quiz overview</div>
              <div className="muted2" style={{ marginBottom: 12 }}>
                {resumeQuizStarted ? 'Track your progress and review your choices as you move through the quiz.' : 'Choose a focused topic and difficulty to start a local practice session.'}
              </div>

              <div className="resumeQuizInfoStack">
                <div className="resumeQuizInfoItem">
                  <div className="resumeQuizInfoLabel">Selected topic</div>
                  <div className="resumeQuizInfoValue">{activeQuizCategoryLabel}</div>
                </div>
                <div className="resumeQuizInfoItem">
                  <div className="resumeQuizInfoLabel">Selected difficulty</div>
                  <div className="resumeQuizInfoValue">{activeQuizDifficultyLabel}</div>
                </div>
                <div className="resumeQuizInfoItem">
                  <div className="resumeQuizInfoLabel">Questions</div>
                  <div className="resumeQuizInfoValue">{resumeQuizStarted ? `${resumeQuizQuestions.length}` : 'Choose to begin'}</div>
                </div>
                <div className="resumeQuizInfoItem">
                  <div className="resumeQuizInfoLabel">Answered</div>
                  <div className="resumeQuizInfoValue">{resumeQuizStarted ? answeredQuizQuestions : '0'}</div>
                </div>
              </div>
            </div>
          </div>
        ) : activeMode === 'learningHub' ? (
          learningHubLesson ? (
            learningHubLesson === 'resume-sections' ? (
              <ResumeSections
                onBack={() => setLearningHubLesson(null)}
                onOpenAnalyzer={() => switchMode('analyzer')}
              />
            ) : 

            learningHubLesson === 'ats-guide' ? (
              <ATSGuide
                onBack={() => setLearningHubLesson(null)}
                onOpenAnalyzer={() => switchMode('analyzer')}
              />
            ) : 

            learningHubLesson === 'projects-skills' ? (
              <ProjectSkill
                onBack={() => setLearningHubLesson(null)}
                onOpenAnalyzer={() => switchMode('analyzer')}
              />
            ) :   
            
            learningHubLesson === 'fresh-graduate' ? (
              <FreshGraduate
                onBack={() => setLearningHubLesson(null)}
                onOpenAnalyzer={() => switchMode('analyzer')}
              />
            ) :
            
            learningHubLesson === 'interview-tips' ? (
              <InterviewTips
                onBack={() => setLearningHubLesson(null)}
                onOpenAnalyzer={() => switchMode('analyzer')}
              />
            ) :
            
            (
              <div className="card" style={{ maxWidth: 1400, margin: '0 auto', padding: 24 }}>
                <button
                  type="button"
                  className="buttonSmall"
                  onClick={() => setLearningHubLesson(null)}
                  style={{ marginBottom: 16 }}
                >
                  ← Back to Learning Hub
                </button>

                <div className="learningHubLesson">
                  <div className="learningHubLessonMeta">
                    <div className="learningHubLessonIcon">{currentLearningHubCategory?.icon ?? '📘'}</div>
                    <div>
                      <div className="muted2">Resume Learning Hub</div>
                      <h2 className="learningHubLessonTitle">{currentLearningHubCategory?.title ?? 'Lesson'}</h2>
                    </div>
                  </div>

                  <div className="learningHubLessonBody">
                    <p>Lesson content coming soon.</p>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div style={{ maxWidth: 1400, margin: '0 auto' }}>
              <div className="cardedu" style={{ padding: 24 }}>
                <div className="cardTitle">📚 Resume Learning Hub</div>
                <div className="muted2" style={{ marginBottom: 18, maxWidth: 760 }}>
                  Learn the fundamentals of creating professional resumes and preparing for your career through structured learning guides.
                </div>

                <div className="learningHubGrid">
                  {LEARNING_HUB_CATEGORIES.map((category) => (
                    <div key={category.key} className="card learningHubCategoryCard">
                      <div className="learningHubCategoryIcon">{category.icon}</div>
                      <div className="cardTitle" style={{ marginBottom: 8 }}>{category.title}</div>
                      <div className="muted2" style={{ marginBottom: 16 }}>
                        {category.description}
                      </div>
                      <button
                        type="button"
                        className="buttonSmall"
                        onClick={() => setLearningHubLesson(category.key)}
                      >
                        Learn More
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
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

      {activeMode === 'analyzer' && mockInterviewModalOpen && mockInterviewStarted ? (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.7)', backdropFilter: 'blur(6px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setMockInterviewModalOpen(false)}
        >
          <div
            className="card"
            style={{ position: 'relative', width: 'min(92vw, 760px)', maxHeight: '90vh', overflowY: 'auto', padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="buttonSmall"
              style={{ position: 'absolute', top: 12, right: 12 }}
              onClick={() => setMockInterviewModalOpen(false)}
            >
               Close
            </button>

            <div className="cardTitle">🎤 Mock Interview Practice</div>

            {mockInterviewCompleted ? (
              <div className="section" style={{ marginTop: 12 }}>
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
                  <button type="button" className="buttonSmall" onClick={onRegenerateAnalyzer}>
                    Regenerate Questions
                  </button>
                  <button type="button" className="buttonSmall" onClick={clearAnalyzerState}>
                    Clear All
                  </button>
                </div>
              </div>
            ) : (
              <form className="section" style={{ marginTop: 12 }} onSubmit={onSubmitInterviewAnswer}>
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
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

