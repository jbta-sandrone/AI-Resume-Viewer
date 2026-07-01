import React from 'react'

type ResumeSectionsProps = {
    onBack: () => void
    onOpenAnalyzer: () => void
}

export default function ProjectSkill({ onBack, onOpenAnalyzer }: ResumeSectionsProps) {
    return (
        <div className="learningHubArticle">
            <div className="learningHubArticleShell">
                <button type="button" className="buttonSmall" onClick={onBack} style={{ marginBottom: 16 }}>
                    ← Back to Learning Hub
                </button>

                <header className="learningHubArticleHeader">
                    <div>
                        <div className="muted2">Resume Learning Hub</div>
                        <h2 className="learningHubLessonTitle">Projects and Skills</h2>
                        <p className="learningHubIntro">
                            Learn how to present your projects, technologies, and skills in a way that helps recruiters understand your value.
                        </p>
                    </div>
                </header>

                <hr style={{ border: '1px solid rgb(179, 175, 175)' }}></hr>

                <article className="learningHubArticleBody">
                    <section className="learningHubSection">
                        <h3>💼 Why Projects and Skills Matter?</h3>
                        <p>
                            For students and fresh graduates, projects often speak louder than work experience. A strong project section shows what you can build, what tools you can use, and how you solve real problems.
                        </p>
                        <p>
                            Your skills section supports this by quickly showing recruiters the technologies, tools, and abilities that match the role.
                        </p>
                    </section>

                    <hr style={{ border: '1px solid rgb(179, 175, 175)' }}></hr>

                    <section className="learningHubSection">
                        <h3>1. Writing Strong Projects</h3>
                        <p>A good project description should answer these questions:</p>
                        <ul className="learningHubChecklist">
                            <li>What did you build?</li>
                            <li>Why did you build it?</li>
                            <li>What technologies did you use?</li>
                            <li>What was your role?</li>
                            <li>What problem did it solve?</li>
                        </ul>
                    </section>

                    <hr style={{ border: '1px solid rgb(179, 175, 175)' }}></hr>

                    <section className="learningHubSection">
                        <h3>2. Recommended Project Format</h3>
                        <p>Each project should include:</p>
                        <ul className="learningHubChecklist">
                            <li>Project Name</li>
                            <li>Technologies Used</li>
                            <li>Short Description</li>
                            <li>Key Features</li>
                            <li>Your Role or Contribution</li>
                            <li>Result or Purpose</li>
                            <li>GitHub Repository or Live Demo, if available</li>
                        </ul>

                        <div className="learningHubExampleBox">
                            <strong>Example Layout:</strong>
                            <div>Project Name: NelWorks - AI Career Assistant</div>
                            <div>Technologies Used: React, TypeScript, Python, FastAPI, Gemini API</div>
                            <div>Description: An AI-powered career assistant designed to help users navigate their professional development journey.</div>
                            <div>Key Features: Resume Analysis, Resume Rewrite, Cover Letter Generator, Interview Question, Resume Quiz, Resume Learning Hub</div>
                            <div>Role: Designed and developed both the frontend and backend of the application.</div>
                        </div>
                    </section>

                    <hr style={{ border: '1px solid rgb(179, 175, 175)' }}></hr>

                    <section className="learningHubSection">
                        <h3>3. Technical Skills</h3>
                        <p>
                            Group your technical skills so recruiters can scan them quickly. Avoid one long random list.
                        </p>

                        <p>Programming Languages:</p>

                        <ul className="learningHubChecklist">   
                            <li>JavaScript</li>
                            <li>TypeScript</li>
                            <li>Python</li>
                            <li>Java</li>
                            
                        </ul> <br></br>

                        <p>Frontend:</p>

                        <ul className="learningHubChecklist">   
                            <li>React</li>
                            <li>HTML5</li>
                            <li>CSS3</li>
                            <li>Tailwind CSS</li>
                            <li>Bootstrap</li>
                            
                        </ul> <br></br>

                        <p>Backend:</p>
                        <ul className="learningHubChecklist">   
                            <li>Node.js</li>
                            <li>FastAPI</li>
                            <li>Express.js</li>
                            <li>Django</li>
                        </ul> <br></br>

                        <p>Database:</p>
                        <ul className="learningHubChecklist">   
                            <li>MySQL</li>
                            <li>PostgreSQL</li>
                            <li>MongoDB</li>

                        </ul> <br></br>
                        
                        <p>Tools:</p>
                        <ul className="learningHubChecklist">   
                            <li>Git</li>
                            <li>GitHub</li>
                            <li>VS Code</li>
                            <li>Figma</li>
                            <li>Firebase</li>
                        </ul>

                    </section>

                    <hr style={{ border: '1px solid rgb(179, 175, 175)' }}></hr>

                    <section className="learningHubSection">
                        <h3>4. Soft Skills</h3>
                        <p>
                            Soft skills are useful, but they are stronger when supported by projects, school activities, OJT, or teamwork experience.
                        </p>
                        <ul className="learningHubChecklist">
                            <li>Communication</li>
                            <li>Teamwork</li>
                            <li>Problem Solving</li>
                            <li>Adaptability</li>
                            <li>Time Management</li>
                            <li>Critical Thinking</li>
                        </ul>
                    </section>

                    <hr style={{ border: '1px solid rgb(179, 175, 175)' }}></hr>

                    <section className="learningHubSection">
                        <h3>5. Common Mistakes</h3>
                        <ul className="learningHubChecklist">
                            <li>Listing too many unrelated skills</li>
                            <li>Including technologies you have never used</li>
                            <li>Writing only “Made a website”</li>
                            <li>Not mentioning your role in a group project</li>
                            <li>Forgetting GitHub or live demo links</li>
                            <li>Using vague words without showing impact</li>
                        </ul>
                    </section>

                    <hr style={{ border: '1px solid rgb(179, 175, 175)' }}></hr>

                    <section className="learningHubSection">
                        <h3>6. Choosing the Right Projects</h3>
                        <p>Choose projects that are relevant, complete, and easy to explain in an interview.</p>
                        <div className="">
                            <strong>Good projects to include:</strong>
                            <ul className="learningHubChecklist">
                                <li>Portfolio Website</li>
                                <li>E-commerce Website</li>
                                <li>AI Resume Assistant</li>
                                <li>Task Manager</li>
                                <li>Inventory System</li>
                                <li>Mobile Ordering System</li>
                                <li>Loan Management System</li>
                            </ul>
                        </div>
                    </section>  

                    <hr style={{ border: '1px solid rgb(179, 175, 175)', marginTop: '28px' }}></hr>               

                    <section className="learningHubSection">
                        <h3>💡 Pro Tip</h3>
                        <p>
                            Three well-explained projects are better than ten generic or unfinished projects. Recruiters care more about what you built, how you built it, and what problem it solves.
                        </p>
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
