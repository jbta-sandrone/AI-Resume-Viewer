import React from 'react'

type ResumeSectionsProps = {
  onBack: () => void
  onOpenAnalyzer: () => void
}

export default function ATSGuide({ onBack, onOpenAnalyzer }: ResumeSectionsProps) {
  return (
    <div className="learningHubArticle">
      <div className="learningHubArticleShell">
        <button type="button" className="buttonSmall" onClick={onBack} style={{ marginBottom: 16 }}>
          ← Back to Learning Hub
        </button>

        <header className="learningHubArticleHeader">
          <div>
            <div className="muted2">Resume Learning Hub</div>
            <h2 className="learningHubLessonTitle">ATS Guide</h2>
            <p className="learningHubIntro">
              Learn how to optimize your resume for Applicant Tracking Systems (ATS) to increase your chances of getting noticed by employers.
            </p>
          </div>
        </header>

        <article className="learningHubArticleBody">
          <section className="learningHubSection">
            <h3>🔎 What is an ATS?</h3>
            
            <p>An ATS is software used by companies to organize, scan, and filter job applications before a recruiter reviews them. Instead of reading every resume manually, many employers first let the ATS search for relevant keywords, skills, job titles, education, and experience. This means a well-qualified candidate can still be rejected if the resume is poorly formatted or difficult for the ATS to read. ATS does not think like a human recruiter. It simply looks for relevant information that matches the job posting.</p>
          </section>

          <hr style={{ border: '1px solid rgba(245, 158, 11, 0.18)' }}></hr>

          <section className="learningHubSection">
            <h3>1. ATS-Friendly Resume Tips</h3>
            <p style={{ fontWeight: 800 }}>
              Use Standard Section Titles
            </p>
            <p>Use headings such as:</p>
            
            <ul className="learningHubChecklist">
              <li>Professional Summary</li>
              <li>Skills</li>
              <li>Projects</li>
              <li>Experience</li>
              <li>Education</li>
              <li>Certifications</li>
            </ul> <br />

            <p>Avoid creative headings like:</p>
            
            <ul className="learningHubChecklist">
              <li>My Journey</li>
              <li>What I Can Do</li>
              <li>My Story</li>

            </ul>

          </section>

          <hr style={{ border: '1px solid rgba(245, 158, 11, 0.18)' }}></hr>

        <section className="learningHubSection">
            <h3>2. Keep Your Layout Simple</h3>
            <p style={{ fontWeight: 800 }}>
              A clean layout improves readability.
            </p>
            <p>Recommended:</p>
            
            <ul className="learningHubChecklist">
              <li>Single-Column Layout</li>
              <li>Clear Headings</li>
              <li>Bullet Points</li>
              <li>Consistent Spacing</li>
              <li>Standard Fonts</li>
              
            </ul> <br />

            <p>Avoid:</p>
            
            <ul className="learningHubChecklist">
              <li>Multiple Columns</li>
              <li>Tables</li>
              <li>Text Inside Images</li>
            <li>Decorative Graphics</li>
            <li>Excessive Icons</li>

            </ul>

        </section>

        <hr style={{ border: '1px solid rgba(245, 158, 11, 0.18)' }}></hr>

        <section className="learningHubSection">
            <h3>3. Use Relevant Keywords</h3>
            <p style={{ fontWeight: 800 }}>
              Read the job description carefully.
            </p>
            <p>If it mentions:</p>
            
            <ul className="learningHubChecklist">
              <li>React</li>
              <li>JavaScript</li>
              <li>TypeScript</li>
              <li>REST API</li>
              <li>Git</li>
              <li>SQL</li>
              
            </ul> <br />

            <p style={{fontStyle: 'italic'}}>Include those skills naturally only if you actually have them. Do not add keywords you cannot explain during an interview.</p>
            
        </section>

        <hr style={{ border: '1px solid rgba(245, 158, 11, 0.18)' }}></hr>


        <section className="learningHubSection">
            <h3>4. Choose ATS-Friendly Fonts</h3>
            <p style={{ fontWeight: 800 }}>
                Use standard fonts that are easy to read.
            </p>
            <p>Recommended Fonts:</p>
            
            <ul className="learningHubChecklist">
              <li>Arial</li>
              <li>Helvetica</li>
              <li>Times New Roman</li>
              <li>Georgia</li>
              <li>Calibri</li>
              <li>Aptos</li>
              
            </ul> <br />

            <p style={{fontStyle: 'italic'}}>Avoid decorative fonts that reduce readability.</p>
            
        </section>

        <hr style={{ border: '1px solid rgba(245, 158, 11, 0.18)' }}></hr>


        <section className="learningHubSection">
            <h3>5. Save in the Correct File Format</h3>
            <p style={{ fontWeight: 800 }}>
                Always follow the employer's instructions.
            </p>
            <p>Most companies accept:</p>
            
            <ul className="learningHubChecklist">
              <li>DOCX</li>
              <li>PDF</li>
              
            </ul> <br />

            <p style={{fontStyle: 'italic'}}>If no format is specified, PDF is generally a safe choice because it preserves formatting.</p>
            
        </section>

        <hr style={{ border: '1px solid rgba(245, 158, 11, 0.18)' }}></hr>


        <section className="learningHubSection">
            <h3>6. Common ATS Mistakes</h3>
            <p style={{ fontWeight: 800 }}>
                Avoid these common mistakes that can prevent your resume from being read correctly.
            </p>
            
            <ul className="learningHubChecklist">
              <li>Using tables for important information</li>
              <li>Placing contact information inside headers or images</li>
            <li>Uploading scanned image PDFs</li>
            <li>Using unprofessional file names</li>
            <li>Keyword stuffing</li>
            <li>Adding unnecessary graphics</li>
            <li>Writing long paragraphs</li>
            <li>Using inconsistent formatting</li>
              
            </ul> <br />

        </section>

        <hr style={{ border: '1px solid rgba(245, 158, 11, 0.18)' }}></hr>

                <section className="learningHubSection">
            <h3>7. ATS Do's and Don'ts</h3>
            <p style={{ fontWeight: 800 }}>
                Follow these guidelines to ensure your resume is properly parsed by Applicant Tracking Systems.
            </p>
            <p> Do:</p>
            
            <ul className="learningHubChecklist">
              <li>Use clear section headings</li>
              <li>Tailor your resume to the job</li>
            <li>Use action verbs</li>
            <li>Include measurable achievements</li>
            <li>Keep formatting clean</li>
            <li>Proofread your resume</li>
              
            </ul> <br />

            <p> Don'ts:</p>
            
            <ul className="learningHubChecklist">
              <li>Copy the entire job description</li>
              <li>Add fake skills</li>
            <li>Overuse keywords</li>
            <li>Use colorful graphics everywhere</li>
            <li>Make the resume difficult to scan</li>
            <li>Submit without proofreading</li>
              
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
