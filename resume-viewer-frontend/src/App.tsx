import React, { useEffect, useMemo, useRef, useState } from 'react'
import { analyzeResume, generateCoverLetter, evaluateInterviewAnswer, generateInterviewQuestions, chatWithResume, generateResumeDesignerData } from './api/client'
import type { AnalyzeResponse, InterviewEvaluationResponse, InterviewQuestionsResponse } from './api/types'
import type { ResumeDesignerData } from './api/client'
import { QUIZ_CATEGORIES, QUIZ_DIFFICULTIES, getQuizQuestions, type QuizCategory, type QuizDifficulty, type ResumeQuizQuestion } from './quizQuestions'

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

function joinDesignerItems(items: Array<string | undefined | null> | undefined, limit = 8) {
  return (items ?? [])
    .filter((item): item is string => Boolean(item && item.trim()))
    .slice(0, limit)
    .join(' • ')
}

function buildDesignerContent(data: ResumeDesignerData) {
  const tools = joinDesignerItems([
    ...(data.designTools ?? []),
    ...(data.aiTools ?? []),
    ...(data.toolsPlatforms ?? []),
  ], 10)
  const projects = joinDesignerItems([...(data.projects ?? []), ...(data.academicProjects ?? [])], 4)
  const credentials = joinDesignerItems([...(data.certifications ?? []), ...(data.awards ?? [])], 4)

  return {
    summary: data.summary?.trim() ?? '',
    skills: joinDesignerItems(data.skills, 8),
    softSkills: joinDesignerItems(data.softSkills, 6),
    tools,
    languages: joinDesignerItems(data.languages, 6),
    experience: joinDesignerItems(data.experience, 3),
    projects,
    education: joinDesignerItems(data.education, 3),
    activities: joinDesignerItems(data.activities, 3),
    credentials,
  }
}

function buildDesignerSectionMarkup(entries: Array<{ label: string; content: string }>) {
  return entries
    .filter(({ content }) => content)
    .map(({ label, content }) => `<div class="section"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(content)}</div></div>`)
    .join('')
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

type Mode = 'chat' | 'analyzer' | 'designer' | 'coverLetter' | 'resumeQuiz'
type DesignerStyle = 'basic' | 'modern' | 'professional'
type DesignerTemplate = {
  id: string
  name: string
  style: DesignerStyle
}

type DesignerTemplatePreview = {
  template: DesignerTemplate
  data: ResumeDesignerData
}

const DESIGNER_TEMPLATES: Record<DesignerStyle, Array<{ id: string; name: string }>> = {
  basic: [
    { id: 'basic-clean', name: 'Basic Clean' },
    { id: 'basic-compact', name: 'Basic Compact' },
    { id: 'basic-ats', name: 'Basic ATS' },
  ],
  modern: [
    { id: 'modern-gold', name: 'Modern Gold' },
    { id: 'modern-sidebar', name: 'Modern Sidebar' },
    { id: 'modern-elegant', name: 'Modern Elegant' },
  ],
  professional: [
    { id: 'professional-corporate', name: 'Professional Corporate' },
    { id: 'professional-executive', name: 'Professional Executive' },
    { id: 'professional-minimal', name: 'Professional Minimal' },
  ],
}

function resetFileInput(inputRef: React.MutableRefObject<HTMLInputElement | null>) {
  if (inputRef.current) {
    inputRef.current.value = ''
  }
}

function renderDesignerHtml(template: DesignerTemplate, data: ResumeDesignerData) {
  const contact = joinDesignerItems(data.contact)
  const content = buildDesignerContent(data)
  const summary = content.summary

  if (template.id === 'basic-clean') {
    const sections = buildDesignerSectionMarkup([
      { label: 'Technical Skills', content: content.skills },
      { label: 'Soft Skills', content: content.softSkills },
      { label: 'Tools & Platforms', content: content.tools },
      { label: 'Experience', content: content.experience },
      { label: 'Education', content: content.education },
      { label: 'Projects', content: content.projects },
      { label: 'Languages', content: content.languages },
      { label: 'Certificates & Awards', content: content.credentials },
    ])
    return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${escapeHtml(template.name)}</title><style>body{font-family:Inter,system-ui,sans-serif;padding:24px;background:#f8fafc;color:#111827} .wrap{max-width:860px;margin:0 auto;background:#ffffff;border:1px solid #111827;padding:28px;border-radius:0} .title{font-size:24px;font-weight:800;letter-spacing:0.02em;margin-bottom:6px} .meta{font-size:12px;color:#374151;margin-bottom:14px} .summary{font-size:13px;line-height:1.6;color:#111827;margin-bottom:16px} .section{margin-top:12px;padding-top:10px;border-top:1px solid #d1d5db} .label{font-size:11px;text-transform:uppercase;letter-spacing:0.16em;font-weight:800;color:#111827;margin-bottom:4px} .value{font-size:13px;line-height:1.55}@media print{body{padding:0.3in}}</style></head><body><div class="wrap"><div class="title">${escapeHtml(data.name || 'Resume')}</div><div class="meta">${escapeHtml(contact)}</div>${summary ? `<div class="summary">${escapeHtml(summary)}</div>` : ''}${sections}</div></body></html>`
  }

  if (template.id === 'basic-compact') {
    const sections = buildDesignerSectionMarkup([
      { label: 'Technical Skills', content: content.skills },
      { label: 'Experience', content: content.experience },
      { label: 'Projects', content: content.projects },
      { label: 'Education', content: content.education },
      { label: 'Tools & Platforms', content: content.tools },
      { label: 'Certifications & Awards', content: content.credentials },
    ])
    return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${escapeHtml(template.name)}</title><style>body{font-family:Inter,system-ui,sans-serif;padding:24px;background:#f8fafc;color:#111827} .wrap{max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #111827;padding:16px;border-radius:0} .title{font-size:18px;font-weight:800;margin-bottom:2px} .meta{font-size:10px;color:#374151;margin-bottom:8px} .summary{font-size:11px;line-height:1.45;color:#111827;margin-bottom:8px} .section{margin-top:8px;padding-top:6px;border-top:1px solid #111827} .label{font-size:10px;text-transform:uppercase;letter-spacing:0.14em;font-weight:800;color:#111827;margin-bottom:2px} .value{font-size:11px;line-height:1.45}@media print{body{padding:0.25in}}</style></head><body><div class="wrap"><div class="title">${escapeHtml(data.name || 'Resume')}</div><div class="meta">${escapeHtml(contact)}</div>${summary ? `<div class="summary">${escapeHtml(summary)}</div>` : ''}${sections}</div></body></html>`
  }

  if (template.id === 'basic-ats') {
    const sections = buildDesignerSectionMarkup([
      { label: 'Professional Summary', content: summary },
      { label: 'Technical Skills', content: content.skills },
      { label: 'Soft Skills', content: content.softSkills },
      { label: 'Tools & Platforms', content: content.tools },
      { label: 'Experience', content: content.experience },
      { label: 'Education', content: content.education },
      { label: 'Projects', content: content.projects },
    ])
    return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${escapeHtml(template.name)}</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:24px;background:#ffffff;color:#111827} .wrap{max-width:860px;margin:0 auto;background:#fff;border:1px solid #111827;padding:20px;border-radius:0} .title{font-size:22px;font-weight:700;margin-bottom:4px} .meta{font-size:11px;color:#111827;margin-bottom:10px} .section{margin-top:10px;padding-top:8px;border-top:1px solid #d1d5db} .label{font-size:11px;font-weight:700;color:#111827;margin-bottom:3px;text-transform:uppercase;letter-spacing:0.03em} .value{font-size:12px;line-height:1.45}@media print{body{padding:0.3in}}</style></head><body><div class="wrap"><div class="title">${escapeHtml(data.name || 'Resume')}</div><div class="meta">${escapeHtml(contact)}</div>${sections}</div></body></html>`
  }

  if (template.id === 'modern-gold') {
    const sections = buildDesignerSectionMarkup([
      { label: 'Technical Skills', content: content.skills },
      { label: 'Tools & Platforms', content: content.tools },
      { label: 'Experience', content: content.experience },
      { label: 'Projects', content: content.projects },
      { label: 'Education', content: content.education },
      { label: 'Languages', content: content.languages },
    ])
    return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${escapeHtml(template.name)}</title><style>body{font-family:Inter,system-ui,sans-serif;padding:24px;background:#111827;color:#f8fafc} .wrap{max-width:900px;margin:0 auto;background:linear-gradient(135deg,#111827 0%,#1f2937 100%);border:1px solid rgba(245,158,11,0.35);padding:24px;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.2)} .hero{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:2px solid #fbbf24;margin-bottom:14px} .title{font-size:24px;font-weight:800} .meta{font-size:12px;color:#fcd34d;margin-top:4px} .summary{font-size:13px;line-height:1.55;color:#f8fafc;margin-bottom:14px} .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px} .card{background:rgba(255,255,255,0.06);padding:12px;border:1px solid rgba(245,158,11,0.2);border-radius:14px} .label{font-size:10px;text-transform:uppercase;letter-spacing:0.16em;font-weight:800;color:#fbbf24;margin-bottom:6px} .value{font-size:12px;line-height:1.5;color:#f8fafc}@media print{body{padding:0.3in}}</style></head><body><div class="wrap"><div class="hero"><div><div class="title">${escapeHtml(data.name || 'Resume')}</div><div class="meta">${escapeHtml(contact)}</div></div><div class="meta">${escapeHtml(template.name)}</div></div>${summary ? `<div class="summary">${escapeHtml(summary)}</div>` : ''}<div class="grid"><div class="card"><div class="label">Technical Skills</div><div class="value">${escapeHtml(content.skills)}</div></div><div class="card"><div class="label">Tools & Platforms</div><div class="value">${escapeHtml(content.tools)}</div></div></div><div class="grid" style="margin-top:12px"><div class="card"><div class="label">Experience</div><div class="value">${escapeHtml(content.experience)}</div></div><div class="card"><div class="label">Projects</div><div class="value">${escapeHtml(content.projects)}</div></div></div></div></body></html>`
  }

  if (template.id === 'modern-sidebar') {
    const sidebarContent = buildDesignerSectionMarkup([
      { label: 'Technical Skills', content: content.skills },
      { label: 'Soft Skills', content: content.softSkills },
      { label: 'Languages', content: content.languages },
      { label: 'Tools & Platforms', content: content.tools },
    ])
    const mainContent = buildDesignerSectionMarkup([
      { label: 'Experience', content: content.experience },
      { label: 'Projects', content: content.projects },
      { label: 'Education', content: content.education },
      { label: 'Certificates & Awards', content: content.credentials },
    ])
    return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${escapeHtml(template.name)}</title><style>body{font-family:Inter,system-ui,sans-serif;padding:24px;background:#f8fafc;color:#111827} .wrap{max-width:920px;margin:0 auto;display:grid;grid-template-columns:240px 1fr;background:#111827;color:#f8fafc;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.15)} .sidebar{background:#fbbf24;padding:20px;color:#111827} .main{padding:24px 24px 24px 20px} .title{font-size:22px;font-weight:800;margin-bottom:6px} .meta{font-size:11px;line-height:1.45;color:#1f2937} .summary{font-size:13px;line-height:1.55;color:#f8fafc;margin-bottom:12px} .section{margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.16)} .label{font-size:10px;text-transform:uppercase;letter-spacing:0.16em;font-weight:800;color:#fbbf24;margin-bottom:6px} .value{font-size:12px;line-height:1.5;color:#f8fafc}@media print{body{padding:0.3in}}</style></head><body><div class="wrap"><div class="sidebar"><div class="title">${escapeHtml(data.name || 'Resume')}</div><div class="meta">${escapeHtml(contact)}</div>${sidebarContent}</div><div class="main">${summary ? `<div class="summary">${escapeHtml(summary)}</div>` : ''}${mainContent}</div></div></body></html>`
  }

  if (template.id === 'modern-elegant') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${escapeHtml(template.name)}</title><style>body{font-family:Inter,system-ui,sans-serif;padding:24px;background:#fffbeb;color:#431407} .wrap{max-width:900px;margin:0 auto;background:#ffffff;border:1px solid #fde68a;padding:24px;border-radius:20px;box-shadow:0 10px 26px rgba(0,0,0,0.08)} .hero{display:flex;justify-content:space-between;align-items:center;padding-bottom:12px;border-bottom:2px solid #f59e0b;margin-bottom:12px} .title{font-size:24px;font-weight:800} .meta{font-size:12px;color:#9a2c00;margin-top:4px} .pill{display:inline-block;padding:6px 10px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:700} .card{margin-top:10px;padding:12px;border:1px solid #fef3c7;border-left:4px solid #f59e0b;background:#fffbeb;border-radius:14px} .label{font-size:10px;text-transform:uppercase;letter-spacing:0.16em;font-weight:800;color:#92400e;margin-bottom:6px} .value{font-size:12px;line-height:1.5;color:#431407}@media print{body{padding:0.3in}}</style></head><body><div class="wrap"><div class="hero"><div><div class="title">${escapeHtml(data.name || 'Resume')}</div><div class="meta">${escapeHtml(contact)}</div></div><div class="pill">${escapeHtml(template.name)}</div></div><div class="card"><div class="label">Summary</div><div class="value">${escapeHtml(summary)}</div></div><div class="card"><div class="label">Technical Skills</div><div class="value">${escapeHtml(content.skills)}</div></div><div class="card"><div class="label">Experience</div><div class="value">${escapeHtml(content.experience || content.projects)}</div></div></div></body></html>`
  }

  if (template.id === 'professional-corporate') {
    const sections = buildDesignerSectionMarkup([
      { label: 'Experience', content: content.experience },
      { label: 'Technical Skills', content: content.skills },
      { label: 'Education', content: content.education },
      { label: 'Projects', content: content.projects },
      { label: 'Certificates & Awards', content: content.credentials },
    ])
    return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${escapeHtml(template.name)}</title><style>body{font-family:Georgia,Times New Roman,serif;padding:24px;background:#f8fafc;color:#334155} .wrap{max-width:900px;margin:0 auto;background:#f8fafc;border:1px solid #cbd5e1;padding:28px;border-radius:18px} .hero{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:12px;border-bottom:2px solid #334155;margin-bottom:12px} .title{font-size:24px;font-weight:800;color:#0f172a} .meta{font-size:12px;color:#475569;margin-top:4px} .summary{font-size:13px;line-height:1.55;color:#334155;margin-bottom:14px} .section{margin-top:12px;padding-top:10px;border-top:1px solid #cbd5e1} .label{font-size:10px;text-transform:uppercase;letter-spacing:0.16em;font-weight:800;color:#334155;margin-bottom:6px} .value{font-size:12px;line-height:1.5;color:#334155}@media print{body{padding:0.3in}}</style></head><body><div class="wrap"><div class="hero"><div><div class="title">${escapeHtml(data.name || 'Resume')}</div><div class="meta">${escapeHtml(contact)}</div></div><div class="meta">${escapeHtml(template.name)}</div></div>${summary ? `<div class="summary">${escapeHtml(summary)}</div>` : ''}${sections}</div></body></html>`
  }

  if (template.id === 'professional-executive') {
    return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${escapeHtml(template.name)}</title><style>body{font-family:Inter,system-ui,sans-serif;padding:24px;background:#0f172a;color:#f8fafc} .wrap{max-width:900px;margin:0 auto;background:#111827;border:1px solid rgba(245,158,11,0.25);padding:24px;border-radius:20px;box-shadow:0 10px 30px rgba(0,0,0,0.2)} .hero{padding:14px 16px;border-left:4px solid #f59e0b;background:#1f2937;margin-bottom:14px} .title{font-size:26px;font-weight:800} .meta{font-size:12px;color:#cbd5e1;margin-top:4px} .summary{font-size:13px;line-height:1.55;color:#f8fafc;margin:0 0 14px 0;padding:10px 12px;border-left:4px solid #b45309;background:#1f2937} .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px} .card{background:#f8fafc;color:#111827;padding:10px 12px;border-radius:12px} .label{font-size:10px;text-transform:uppercase;letter-spacing:0.16em;font-weight:800;color:#b45309;margin-bottom:6px} .value{font-size:12px;line-height:1.5;color:#111827}@media print{body{padding:0.3in}}</style></head><body><div class="wrap"><div class="hero"><div class="title">${escapeHtml(data.name || 'Resume')}</div><div class="meta">${escapeHtml(contact)}</div></div>${summary ? `<div class="summary">${escapeHtml(summary)}</div>` : ''}<div class="grid"><div class="card"><div class="label">Experience</div><div class="value">${escapeHtml(content.experience)}</div></div><div class="card"><div class="label">Technical Skills</div><div class="value">${escapeHtml(content.skills)}</div></div></div></div></body></html>`
  }

  if (template.id === 'professional-minimal') {
    const sections = buildDesignerSectionMarkup([
      { label: 'Technical Skills', content: content.skills },
      { label: 'Experience', content: content.experience },
      { label: 'Projects', content: content.projects },
      { label: 'Education', content: content.education },
      { label: 'Certificates & Awards', content: content.credentials },
    ])
    return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${escapeHtml(template.name)}</title><style>body{font-family:Inter,system-ui,sans-serif;padding:24px;background:#f8fafc;color:#0f172a} .wrap{max-width:900px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;padding:24px;border-radius:16px} .hero{padding-bottom:10px;border-bottom:1px solid #cbd5e1;margin-bottom:12px} .title{font-size:22px;font-weight:700} .meta{font-size:12px;color:#64748b;margin-top:4px} .summary{font-size:13px;line-height:1.55;color:#0f172a;margin-bottom:12px} .section{margin-top:10px;padding:10px;border:1px solid #f1f5f9;background:#fcfdff;border-radius:10px} .label{font-size:10px;text-transform:uppercase;letter-spacing:0.16em;font-weight:800;color:#0f172a;margin-bottom:4px} .value{font-size:12px;line-height:1.5;color:#0f172a}@media print{body{padding:0.3in}}</style></head><body><div class="wrap"><div class="hero"><div class="title">${escapeHtml(data.name || 'Resume')}</div><div class="meta">${escapeHtml(contact)}</div></div>${summary ? `<div class="summary">${escapeHtml(summary)}</div>` : ''}${sections}</div></body></html>`
  }

  return ''
}

function downloadDesignerPdf(template: DesignerTemplate, data: ResumeDesignerData) {
  const html = renderDesignerHtml(template, data)
  const win = window.open('about:blank', '_blank')
  if (!win) {
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${template.id}.html`
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
  setTimeout(() => win.print(), 220)
}

function renderPreviewSections(
  sections: Array<{ label: string; content: string }>,
  blockClass = 'designerPreviewSectionBlock',
  containerClass = 'designerPreviewSectionList'
) {
  const visibleSections = sections.filter(({ content }) => content)
  if (!visibleSections.length) return null

  return (
    <div className={containerClass}>
      {visibleSections.map((section) => (
        <div className={blockClass} key={section.label}>
          <div className="designerPreviewSectionTitle">{section.label}</div>
          <div className="designerPreviewList">{section.content}</div>
        </div>
      ))}
    </div>
  )
}

function DesignerPreviewCard({ template, data }: DesignerTemplatePreview) {
  const baseClass = `designerPreviewCanvas designerPreviewCanvas--${template.style} designerPreviewCanvas--${template.id}`
  const content = buildDesignerContent(data)

  if (template.style === 'basic') {
    if (template.id === 'basic-compact') {
      return (
        <div className={baseClass}>
          <div className="designerPreviewHeaderCompact">
            <div>
              <div className="designerPreviewName">{data.name || 'Your Name'}</div>
              <div className="designerPreviewMeta">{data.contact.slice(0, 2).join(' • ') || 'Contact details'}</div>
            </div>
            <div className="designerPreviewTag">{template.name}</div>
          </div>
          {renderPreviewSections([
            { label: 'Summary', content: content.summary },
            { label: 'Technical Skills', content: content.skills },
            { label: 'Experience', content: content.experience },
            { label: 'Projects', content: content.projects },
          ], 'designerPreviewMiniSection', 'designerPreviewSectionList designerPreviewSectionList--compact')}
        </div>
      )
    }

    if (template.id === 'basic-ats') {
      return (
        <div className={baseClass}>
          <div className="designerPreviewHeader">
            <div>
              <div className="designerPreviewName">{data.name || 'Your Name'}</div>
              <div className="designerPreviewMeta">{data.contact.slice(0, 2).join(' • ') || 'Contact details'}</div>
            </div>
            <div className="designerPreviewTag">{template.name}</div>
          </div>
          {renderPreviewSections([
            { label: 'Professional Summary', content: content.summary },
            { label: 'Technical Skills', content: content.skills },
            { label: 'Tools & Platforms', content: content.tools },
          ], 'designerPreviewMiniSection', 'designerPreviewSectionList')}
        </div>
      )
    }

    return (
      <div className={baseClass}>
        <div className="designerPreviewHeader">
          <div>
            <div className="designerPreviewName">{data.name || 'Your Name'}</div>
            <div className="designerPreviewMeta">{data.contact.slice(0, 2).join(' • ') || 'Contact details'}</div>
          </div>
          <div className="designerPreviewTag">{template.name}</div>
        </div>
        <div className="designerPreviewSummary">{content.summary || 'Professional summary appears here.'}</div>
        {renderPreviewSections([
          { label: 'Experience', content: content.experience },
          { label: 'Education', content: content.education },
          { label: 'Certificates & Awards', content: content.credentials },
        ])}
      </div>
    )
  }

  if (template.style === 'modern') {
    if (template.id === 'modern-sidebar') {
      return (
        <div className={baseClass}>
          <div className="designerPreviewSidebar">
            <div className="designerPreviewName">{data.name || 'Your Name'}</div>
            <div className="designerPreviewMeta">{data.contact.slice(0, 2).join(' • ') || 'Contact details'}</div>
            <div className="designerPreviewSectionTitle">Skills</div>
            <div className="designerPreviewPills">{content.skills || 'Skills'}</div>
            <div className="designerPreviewSectionTitle">Tools</div>
            <div className="designerPreviewPills">{content.tools || 'Tools'}</div>
          </div>
          <div className="designerPreviewMain">
            <div className="designerPreviewTag">{template.name}</div>
            <div className="designerPreviewSummary">{content.summary || 'Summary'}</div>
            {renderPreviewSections([
              { label: 'Experience', content: content.experience },
              { label: 'Projects', content: content.projects },
              { label: 'Education', content: content.education },
            ], 'designerPreviewSectionBlock', 'designerPreviewSectionList')}
          </div>
        </div>
      )
    }

    if (template.id === 'modern-elegant') {
      return (
        <div className={baseClass}>
          <div className="designerPreviewHeader">
            <div>
              <div className="designerPreviewName">{data.name || 'Your Name'}</div>
              <div className="designerPreviewMeta">{data.contact.slice(0, 2).join(' • ') || 'Contact details'}</div>
            </div>
            <div className="designerPreviewTag">{template.name}</div>
          </div>
          <div className="designerPreviewCardRow">
            <div className="designerPreviewCardPane">
              <div className="designerPreviewSectionTitle">Summary</div>
              <div className="designerPreviewList">{content.summary || 'Summary'}</div>
            </div>
            <div className="designerPreviewCardPane">
              <div className="designerPreviewSectionTitle">Technical Skills</div>
              <div className="designerPreviewList">{content.skills || 'Skills'}</div>
            </div>
          </div>
          <div className="designerPreviewCardRow">
            <div className="designerPreviewCardPane">
              <div className="designerPreviewSectionTitle">Experience</div>
              <div className="designerPreviewList">{content.experience || 'Experience'}</div>
            </div>
            <div className="designerPreviewCardPane">
              <div className="designerPreviewSectionTitle">Projects</div>
              <div className="designerPreviewList">{content.projects || 'Projects'}</div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className={baseClass}>
        <div className="designerPreviewHeader">
          <div>
            <div className="designerPreviewName">{data.name || 'Your Name'}</div>
            <div className="designerPreviewMeta">{data.contact.slice(0, 2).join(' • ') || 'Contact details'}</div>
          </div>
          <div className="designerPreviewTag">{template.name}</div>
        </div>
        <div className="designerPreviewAccentBar" />
        <div className="designerPreviewSummary">{content.summary || 'Summary'}</div>
        <div className="designerPreviewPills">{content.skills || 'Skills'}</div>
        {renderPreviewSections([
          { label: 'Experience', content: content.experience },
          { label: 'Projects', content: content.projects },
          { label: 'Tools & Platforms', content: content.tools },
        ], 'designerPreviewSectionBlock', 'designerPreviewSectionList designerPreviewSectionList--compact')}
      </div>
    )
  }

  if (template.style === 'professional') {
    if (template.id === 'professional-executive') {
      return (
        <div className={baseClass}>
          <div className="designerPreviewHeaderDesigner">
            <div>
              <div className="designerPreviewName">{data.name || 'Your Name'}</div>
              <div className="designerPreviewMeta">{data.contact.slice(0, 2).join(' • ') || 'Contact details'}</div>
            </div>
            <div className="designerPreviewTag">{template.name}</div>
          </div>
          <div className="designerPreviewSummary">{content.summary || 'Summary'}</div>
          {renderPreviewSections([
            { label: 'Experience', content: content.experience },
            { label: 'Technical Skills', content: content.skills },
            { label: 'Education', content: content.education },
          ], 'designerPreviewSectionBlock', 'designerPreviewSectionList designerPreviewSectionList--compact')}
        </div>
      )
    }

    if (template.id === 'professional-minimal') {
      return (
        <div className={baseClass}>
          <div className="designerPreviewHeaderDesigner">
            <div>
              <div className="designerPreviewName">{data.name || 'Your Name'}</div>
              <div className="designerPreviewMeta">{data.contact.slice(0, 2).join(' • ') || 'Contact details'}</div>
            </div>
            <div className="designerPreviewTag">{template.name}</div>
          </div>
          <div className="designerPreviewPanelList">
            <div className="designerPreviewSectionBlock">
              <div className="designerPreviewSectionTitle">Summary</div>
              <div className="designerPreviewList">{content.summary || 'Summary'}</div>
            </div>
            {renderPreviewSections([
              { label: 'Experience', content: content.experience },
              { label: 'Certificates', content: content.credentials },
            ], 'designerPreviewSectionBlock', 'designerPreviewSectionList')}
          </div>
        </div>
      )
    }

    return (
      <div className={baseClass}>
        <div className="designerPreviewHeaderDesigner">
          <div>
            <div className="designerPreviewName">{data.name || 'Your Name'}</div>
            <div className="designerPreviewMeta">{data.contact.slice(0, 2).join(' • ') || 'Contact details'}</div>
          </div>
          <div className="designerPreviewTag">{template.name}</div>
        </div>
        <div className="designerPreviewDivider" />
        <div className="designerPreviewSummary">{content.summary || 'Summary'}</div>
        {renderPreviewSections([
          { label: 'Experience', content: content.experience },
          { label: 'Education', content: content.education },
          { label: 'Projects', content: content.projects },
        ], 'designerPreviewSectionBlock', 'designerPreviewSectionList designerPreviewSectionList--compact')}
      </div>
    )
  }

  return (
    <div className={baseClass}>
      <div className="designerPreviewHeader">
        <div>
          <div className="designerPreviewName">{data.name || 'Your Name'}</div>
          <div className="designerPreviewMeta">{data.contact.slice(0, 2).join(' • ') || 'Contact details'}</div>
        </div>
        <div className="designerPreviewTag">{template.name}</div>
      </div>
      <div className="designerPreviewSummary">{content.summary || 'Summary'}</div>
      {renderPreviewSections([
        { label: 'Technical Skills', content: content.skills },
        { label: 'Experience', content: content.experience },
        { label: 'Projects', content: content.projects },
      ], 'designerPreviewSectionBlock', 'designerPreviewSectionList designerPreviewSectionList--compact')}
    </div>
  )
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

  const [designerFile, setDesignerFile] = useState<File | null>(null)
  const [selectedStyle, setSelectedStyle] = useState<DesignerStyle>('basic')
  const [generatedTemplates, setGeneratedTemplates] = useState<Array<DesignerTemplatePreview>>([])
  const [designerLoading, setDesignerLoading] = useState(false)
  const [designerError, setDesignerError] = useState<string | null>(null)
  const [designerPreview, setDesignerPreview] = useState<DesignerTemplatePreview | null>(null)

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

  const activeQuizCategoryLabel = QUIZ_CATEGORIES.find((category) => category.key === resumeQuizCategory)?.label ?? 'Not selected'
  const activeQuizDifficultyLabel = QUIZ_DIFFICULTIES.find((difficulty) => difficulty.key === resumeQuizDifficulty)?.label ?? 'Not selected'
  const currentResumeQuizQuestion = resumeQuizQuestions[resumeQuizCurrentIndex]
  const answeredQuizQuestions = Object.keys(resumeQuizAnswers).length
  const hasCurrentAnswer = typeof resumeQuizAnswers[currentResumeQuizQuestion?.id ?? -1] === 'number'

  const analyzerInputRef = useRef<HTMLInputElement | null>(null)
  const coverLetterInputRef = useRef<HTMLInputElement | null>(null)
  const chatInputRef = useRef<HTMLInputElement | null>(null)
  const designerInputRef = useRef<HTMLInputElement | null>(null)

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

    if (activeMode === 'designer') {
      return [
        '🧾 Extracting your resume content...',
        '🧱 Building professional layouts...',
        '✦ Styling your resume previews...',
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
    setDesignerFile(null)
    setSelectedStyle('basic')
    setGeneratedTemplates([])
    setDesignerLoading(false)
    setDesignerError(null)
    setDesignerPreview(null)
    resetFileInput(analyzerInputRef)
    resetFileInput(coverLetterInputRef)
    resetFileInput(designerInputRef)
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

  function clearDesignerState() {
    setDesignerFile(null)
    setSelectedStyle('basic')
    setGeneratedTemplates([])
    setDesignerLoading(false)
    setDesignerError(null)
    setDesignerPreview(null)
    setError(null)
    setCopyState('idle')
    setLoading(false)
    resetFileInput(designerInputRef)
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

  async function onGenerateDesignerTemplates(e?: React.FormEvent) {
    e?.preventDefault()
    if (activeMode !== 'designer') return

    setDesignerError(null)
    setGeneratedTemplates([])
    setDesignerPreview(null)

    if (!designerFile) {
      setDesignerError('Upload a PDF resume first.')
      return
    }

    setDesignerLoading(true)
    setLoading(true)
    try {
      const data = await generateResumeDesignerData({ file: designerFile })
      const templates = DESIGNER_TEMPLATES[selectedStyle].map((item) => ({
        template: { id: item.id, name: item.name, style: selectedStyle },
        data,
      }))
      setGeneratedTemplates(templates)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Designer generation failed'
      setDesignerError(msg)
    } finally {
      setDesignerLoading(false)
      setLoading(false)
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
  const hasDesignerTemplates = generatedTemplates.length > 0

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
            className={`sidebarItem ${activeMode === 'designer' ? 'active' : ''}`}
            onClick={() => switchMode('designer')}
          >
            <span className="sidebarIcon">🎨</span>
            <span className="sidebarItemText">Resume Designer</span>
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
                    : activeMode === 'designer'
                      ? 'Transform your existing resume into multiple professional resume designs.'
                      : activeMode === 'resumeQuiz'
                        ? 'Test your resume knowledge with a structured quiz of common resume best practices.'
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
                    : activeMode === 'designer'
                      ? 'Ready for designs'
                      : activeMode === 'resumeQuiz'
                        ? 'Ready for the resume quiz'
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
        ) : activeMode === 'designer' ? (
          <div className="grid columns2" style={{ marginTop: 0, gap: 16 }}>
            <div className="card">
              <div className="cardTitle">🎨 Resume Designer</div>
              <div className="muted2" style={{ marginBottom: 14 }}>
                Upload a PDF resume and generate fully local, style-based resume layouts without AI.
              </div>

              <label className="label">Resume PDF</label>
              <div className="uploadZone" role="button" tabIndex={0}>
                <input
                  ref={designerInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={(ev) => {
                    setDesignerFile(ev.target.files?.[0] ?? null)
                    resetFileInput(designerInputRef)
                  }}
                />
                <div className="uploadIcon">⤒</div>
                <div className="uploadText">Upload file</div>
                <div className="uploadSub">or drag & drop</div>
                {designerFile ? <div className="uploadFileName">{designerFile.name}</div> : null}
              </div>

              <label className="label">Choose a style family</label>
              <div className="designerStyleRow">
                {(['basic', 'modern', 'professional'] as DesignerStyle[]).map((style) => (
                  <button
                    key={style}
                    type="button"
                    className={`designerStyleCard ${selectedStyle === style ? 'active' : ''}`}
                    onClick={() => setSelectedStyle(style)}
                  >
                    <div className="designerStyleTitle">
                      {style === 'basic' ? 'Basic' : style === 'modern' ? 'Modern' : 'Professional'}
                    </div>
                    <div className="designerStyleSub">
                      {style === 'basic' ? 'Clean ATS-friendly layouts' : style === 'modern' ? 'Polished, fresh presentation' : 'Executive-level structure'}
                    </div>
                  </button>
                ))}
              </div>

              <div className="rewriteActions" style={{ marginTop: 12 }}>
                <button className="button" type="button" onClick={() => void onGenerateDesignerTemplates()} disabled={designerLoading || !designerFile}>
                  {designerLoading ? 'Generating…' : 'Generate Designs'}
                </button>
                <button className="buttonSmall" type="button" onClick={clearDesignerState} disabled={designerLoading}>
                  Clear All
                </button>
              </div>

              {designerError ? <div className="error">{designerError}</div> : null}
              {hasDesignerTemplates && !designerError ? <div className="success">Designer templates generated.</div> : null}
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="cardTitle">🧱 Generated templates</div>
              {generatedTemplates.length ? (
                <div className="designerList">
                  {generatedTemplates.map((item) => (
                    <div key={item.template.id} className="designerTemplateCard">
                      <DesignerPreviewCard template={item.template} data={item.data} />
                      <div className="designerTemplateActions">
                        <button type="button" className="buttonSmall" onClick={() => setDesignerPreview(item)}>
                          Preview
                        </button>
                        <button type="button" className="buttonSmall" onClick={() => downloadDesignerPdf(item.template, item.data)}>
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="muted2">
                  Upload a resume and generate templates to see local preview cards here.
                </div>
              )}
            </div>
          </div>
        ) : activeMode === 'resumeQuiz' ? (
          <div className="resumeQuizLayout">
            <div className="card resumeQuizMainCard">
              <div className="cardTitle">🧠 Resume Quiz</div>
              <div className="muted2" style={{ marginBottom: 14 }}>
                Answer resume best-practice questions locally. Pick a category and difficulty, then submit each answer to progress.
              </div>

              {!resumeQuizStarted ? (
                <div className="resumeQuizSetupStack">
                  <div className="card resumeQuizSetupCard">
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

                  <div className="card resumeQuizSetupCard">
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
                    <div className="card resumeQuizResultsCard">
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

      {activeMode === 'designer' && designerPreview ? (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(2, 6, 23, 0.7)', backdropFilter: 'blur(6px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={() => setDesignerPreview(null)}
        >
          <div
            className="card"
            style={{ position: 'relative', width: 'min(92vw, 900px)', maxHeight: '90vh', overflowY: 'auto', padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="buttonSmall"
              style={{ position: 'absolute', top: 12, right: 12 }}
              onClick={() => setDesignerPreview(null)}
            >
              Close
            </button>

            <div className="cardTitle">🖼 Template preview</div>
            <DesignerPreviewCard template={designerPreview.template} data={designerPreview.data} />
            <div className="rewriteActions" style={{ marginTop: 14 }}>
              <button type="button" className="button" onClick={() => downloadDesignerPdf(designerPreview.template, designerPreview.data)}>
                Download Template
              </button>
            </div>
          </div>
        </div>
      ) : null}

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

