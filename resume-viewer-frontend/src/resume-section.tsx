import React from 'react'

type ResumeSectionsProps = {
  onBack: () => void
  onOpenAnalyzer: () => void
}

export default function ResumeSections({ onBack, onOpenAnalyzer }: ResumeSectionsProps) {
  return (
    <div className="learningHubArticle">
      <div className="learningHubArticleShell">
        <button type="button" className="buttonSmall" onClick={onBack} style={{ marginBottom: 16 }}>
          ← Back to Learning Hub
        </button>

        <header className="learningHubArticleHeader">
          <div>
            <div className="muted2">Resume Learning Hub</div>
            <h2 className="learningHubLessonTitle">Resume Sections</h2>
            <p className="learningHubIntro">
              Learn the purpose, order, and best practices for each section of a professional resume.
            </p>
          </div>
        </header>

        <article className="learningHubArticleBody">
          <section className="learningHubSection">
            <h3>📄 1. Contact Information</h3>
            <p>
              Include the basics that help recruiters reach you quickly. Make sure your contact details are easy to find and professional.
            </p>
            <div className="learningHubExampleBox">
              <strong>Example:</strong>
              <div>Jonel Bryan T. Ablog</div>
              <div>ablogjonelbryan@gmail.com | +63 976 101 6814 | Vigan City, Ilocos Sur</div>
              <div>linkedin.com/in/jbtablog | github.com/username</div>
            </div>
            <ul className="learningHubChecklist">
              <li>Full name</li>
              <li>Professional email</li>
              <li>Phone number</li>
              <li>Location</li>
              <li>LinkedIn</li>
              <li>GitHub or portfolio if relevant</li>
            </ul>
            <p className="learningHubNote">Common mistakes include an unprofessional email, missing phone details, broken links, or too much personal information.</p>
          </section>

          <section className="learningHubSection">
            <h3>2. Professional Summary</h3>
            <p>
              This is a short 2–4 sentence introduction that highlights your role, strongest skills, and career direction.
            </p>
            <div className="learningHubExampleBox">
              <strong>Good example:</strong>
              <div>
                Motivated BSIT graduate with experience building web applications using React, FastAPI, Firebase, and JavaScript. Skilled in developing user-focused systems, integrating APIs, and creating practical software solutions. Seeking a junior developer role where I can contribute to real-world projects and continue growing as a full-stack developer.
              </div>
            </div>
            <div className="learningHubExampleBox">
              <strong>Bad example:</strong>
              <div>I am hardworking and willing to learn.</div>
            </div>
            <ul className="learningHubChecklist">
              <li>Keep it short</li>
              <li>Mention your target role</li>
              <li>Highlight your strongest skills</li>
              <li>Avoid generic phrases</li>
            </ul>
          </section>

          <section className="learningHubSection">
            <h3>3. Skills</h3>
            <p>
              List skills that are relevant to the role you want. Group them by category so the resume stays easy to scan.
            </p>
            <div className="learningHubExampleBox">
              <strong>Example layout:</strong>
              <div>Technical Skills: React, TypeScript, JavaScript, Python, FastAPI, SQL</div>
              <div>Tools: GitHub, VS Code, Firebase, Figma</div>
              <div>Soft Skills: Communication, Problem Solving, Adaptability, Teamwork</div>
            </div>
            <ul className="learningHubChecklist">
              <li>Prioritize relevant skills</li>
              <li>Do not include skills you cannot explain</li>
              <li>Group skills by type</li>
              <li>Avoid long random lists</li>
            </ul>
          </section>

          <section className="learningHubSection">
            <h3>4. Projects</h3>
            <p>
              Projects are especially important for students and fresh graduates because they show practical ability beyond classroom experience.
            </p>
            <div className="learningHubExampleBox">
              <strong>Project format:</strong>
              <div>Project Name</div>
              <div>Technologies Used</div>
              <div>Short description</div>
              <div>Key features</div>
              <div>Your role or contribution</div>
              <div>Result or purpose</div>
            </div>
            <div className="learningHubExampleBox">
              <strong>Good example:</strong>
              <div>NelWorks – AI Career Assistant</div>
              <div>React, TypeScript, FastAPI, Gemini API</div>
              <div>
                Built an AI-powered career assistant that analyzes resumes, rewrites resume content, generates cover letters, creates interview questions, and provides resume learning tools.
              </div>
            </div>
            <div className="learningHubExampleBox">
              <strong>Bad example:</strong>
              <div>Made a resume app.</div>
            </div>
            <ul className="learningHubChecklist">
              <li>Mention technologies used</li>
              <li>Explain what the project does</li>
              <li>Highlight your contribution</li>
              <li>Add GitHub or live demo links if available</li>
              <li>Focus on impact or usefulness</li>
            </ul>
          </section>

          <section className="learningHubSection">
            <h3>5. Education</h3>
            <p>
              Include the details that show your academic background clearly and confidently.
            </p>
            <div className="learningHubExampleBox">
              <strong>Example:</strong>
              <div>University of Northern Philippines</div>
              <div>Bachelor of Science in Information Technology</div>
              <div>Graduated: May 2026</div>
              <div>Honor: Cum Laude</div>
            </div>
            <ul className="learningHubChecklist">
              <li>School name</li>
              <li>Degree</li>
              <li>Graduation date</li>
              <li>Honors</li>
              <li>Relevant coursework if helpful</li>
            </ul>
          </section>

          <section className="learningHubSection">
            <h3>6. Experience / Internship / OJT</h3>
            <p>
              Experience does not always mean full-time work. OJT, internships, freelance work, volunteer roles, and academic leadership can all be relevant.
            </p>
            <div className="learningHubExampleBox">
              <strong>Example bullet:</strong>
              <div>
                Developed and maintained client websites using HTML, CSS, JavaScript, and Mobirise during OJT at CSA Business Consultancy.
              </div>
            </div>
            <ul className="learningHubChecklist">
              <li>Start bullets with action verbs</li>
              <li>Mention tools used</li>
              <li>Include responsibilities or results</li>
              <li>Keep bullets concise</li>
            </ul>
          </section>

          <section className="learningHubSection">
            <h3>7. Certifications and Seminars</h3>
            <p>
              These can strengthen a beginner resume, especially when experience is still limited.
            </p>
            <div className="learningHubExampleBox">
              <strong>Examples:</strong>
              <div>DICT Artificial Intelligence in Data Analytics</div>
              <div>Cybersecurity Seminar</div>
              <div>Internet of Things Seminar</div>
              <div>PowerBI Training</div>
            </div>
            <ul className="learningHubChecklist">
              <li>Include relevant certificates</li>
              <li>Avoid overcrowding this section</li>
              <li>Put the most relevant items first</li>
            </ul>
          </section>

          <section className="learningHubSection">
            <h3>8. Awards and Achievements</h3>
            <p>
              Include achievements that strengthen your credibility such as academic honors, competition wins, leadership roles, or recognition.
            </p>
            <ul className="learningHubChecklist">
              <li>Include achievements that support your profile</li>
              <li>Keep it brief</li>
              <li>Use measurable or specific examples when possible</li>
            </ul>
          </section>

          <section className="learningHubSection">
            <h3>9. Recommended Resume Order</h3>
            <p>
              The best section order depends on your experience level.
            </p>
            <div className="learningHubExampleBox">
              <strong>For Fresh Graduates:</strong>
              <ol className="learningHubChecklist" style={{ listStyle: 'decimal' }}>
                <li>Contact Information</li>
                <li>Professional Summary</li>
                <li>Education</li>
                <li>Skills</li>
                <li>Projects</li>
                <li>OJT / Internship</li>
                <li>Certifications</li>
                <li>Awards</li>
              </ol>
            </div>
            <div className="learningHubExampleBox">
              <strong>For Experienced Applicants:</strong>
              <ol className="learningHubChecklist" style={{ listStyle: 'decimal' }}>
                <li>Contact Information</li>
                <li>Professional Summary</li>
                <li>Work Experience</li>
                <li>Skills</li>
                <li>Projects</li>
                <li>Education</li>
                <li>Certifications</li>
              </ol>
            </div>
          </section>

          <section className="learningHubSection">
            <h3>10. Final Checklist</h3>
            <ul className="learningHubChecklist">
              <li>Contact information is complete</li>
              <li>Summary is specific</li>
              <li>Skills are grouped</li>
              <li>Projects explain technologies and purpose</li>
              <li>Education includes degree and school</li>
              <li>Experience uses action verbs</li>
              <li>Certifications are relevant</li>
              <li>Resume is easy to scan</li>
              <li>No grammar or spelling errors</li>
              <li>Resume is tailored to the job</li>
            </ul>
          </section>
        </article>

        <div className="learningHubCTA">
          <h3>Ready to check your resume?</h3>
          <button type="button" className="button" onClick={onOpenAnalyzer}>
            Open Resume Analyzer
          </button>
        </div>
      </div>
    </div>
  )
}
