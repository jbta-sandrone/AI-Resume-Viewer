import React from 'react'

type ResumeSectionsProps = {
    onBack: () => void
    onOpenAnalyzer: () => void
}

export default function FreshGraduate({ onBack, onOpenAnalyzer }: ResumeSectionsProps) {
    return (
        <div className="learningHubArticle">
            <div className="learningHubArticleShell">
                <button type="button" className="buttonSmall" onClick={onBack} style={{ marginBottom: 16 }}>
                    ← Back to Learning Hub
                </button>

                <header className="learningHubArticleHeader">
                    <div>
                        <div className="muted2">Resume Learning Hub</div>
                        <h2 className="learningHubLessonTitle">Fresh Graduate Guide</h2>
                        <p className="learningHubIntro">
                            Practical advice to help students and fresh graduates build confidence, strengthen their resumes, and prepare for their first professional job.
                        </p>
                    </div>
                </header>

                <article className="learningHubArticleBody">

                    <section className="learningHubSection">
                        <h3>🎓 Starting Your Career</h3>
                        <p>
                            Graduating without years of work experience is completely normal. Recruiters understand that fresh graduates are still developing their careers. Instead of focusing on what you don't have, highlight the knowledge, projects, and experiences that demonstrate your potential.
                        </p>
                    </section>

                    <hr style={{ border: '1px solid rgba(245, 158, 11, 0.18)' }}></hr>

                    <section className="learningHubSection">
                        <h3>1. Build a Strong Resume</h3>
                        <p>
                            Your resume is often the first impression employers have of you. Make it clean, organized, and focused on the job you're applying for.
                        </p>

                        <ul className="learningHubChecklist">
                            <li>Keep it to one page whenever possible.</li>
                            <li>Use clear section headings.</li>
                            <li>Highlight relevant skills and projects.</li>
                            <li>Proofread for grammar and spelling.</li>
                            <li>Tailor it for each application.</li>
                        </ul>
                    </section>

                    <hr style={{ border: '1px solid rgba(245, 158, 11, 0.18)' }}></hr>

                    <section className="learningHubSection">
                        <h3>2. You Don't Need Work Experience</h3>

                        <p>
                            If you don't have professional experience yet, include experiences that demonstrate your abilities.
                        </p>

                        <div className="">
                            <strong>Examples:</strong>

                            <ul className="learningHubChecklist">
                                <li>Capstone Project</li>
                                <li>School Projects</li>
                                <li>Internship / OJT</li>
                                <li>Freelance Work</li>
                                <li>Volunteer Activities</li>
                                <li>Leadership Positions</li>
                            </ul>
                        </div>
                    </section>

                    <hr style={{ border: '1px solid rgba(245, 158, 11, 0.18)' }}></hr>

                    <section className="learningHubSection">
                        <h3>3. Build Personal Projects</h3>

                        <p>
                            Personal projects are one of the best ways to prove your technical skills. Employers appreciate applicants who continue learning outside the classroom.
                        </p>

                        <div className="">
                            <strong>Project Ideas:</strong>

                            <ul className="learningHubChecklist">
                                <li>Portfolio Website</li>
                                <li>Task Manager</li>
                                <li>Weather App</li>
                                <li>Inventory System</li>
                                <li>E-commerce Website</li>
                                <li>AI Resume Assistant</li>
                            </ul>
                        </div>
                    </section>

                    <hr style={{ border: '1px solid rgba(245, 158, 11, 0.18)' }}></hr>

                    <section className="learningHubSection">
                        <h3>4. Build Your Portfolio</h3>

                        <p>
                            A portfolio allows recruiters to see your actual work instead of simply reading about it.
                        </p>

                        <ul className="learningHubChecklist">
                            <li>Include screenshots.</li>
                            <li>Add project descriptions.</li>
                            <li>Provide GitHub links.</li>
                            <li>Include live demos if available.</li>
                            <li>Keep the design clean and responsive.</li>
                        </ul>
                    </section>

                    <hr style={{ border: '1px solid rgba(245, 158, 11, 0.18)' }}></hr>

                    <section className="learningHubSection">
                        <h3>5. Continue Learning</h3>

                        <p>
                            Technology changes quickly. Continue improving your skills through practice and online learning.
                        </p>

                        <div className="">
                            <strong>Recommended Areas:</strong>

                            <ul className="learningHubChecklist">
                                <li>HTML & CSS</li>
                                <li>JavaScript</li>
                                <li>React</li>
                                <li>Git & GitHub</li>
                                <li>Backend Development</li>
                                <li>Databases</li>
                            </ul>
                        </div>
                    </section>

                    <hr style={{ border: '1px solid rgba(245, 158, 11, 0.18)' }}></hr>

                    <section className="learningHubSection">
                        <h3>6. Prepare for Interviews</h3>

                        <p>
                            Technical skills are important, but communication and confidence also matter during interviews.
                        </p>

                        <ul className="learningHubChecklist">
                            <li>Research the company.</li>
                            <li>Practice common interview questions.</li>
                            <li>Review your projects before the interview.</li>
                            <li>Be honest about your experience.</li>
                            <li>Show enthusiasm and willingness to learn.</li>
                        </ul>
                    </section>

                    <hr style={{ border: '1px solid rgba(245, 158, 11, 0.18)' }}></hr>

                    <section className="learningHubSection">
                        <h3>7. Common Mistakes</h3>

                        <ul className="learningHubChecklist">
                            <li>Applying with the same resume everywhere.</li>
                            <li>Leaving the Projects section empty.</li>
                            <li>Listing skills you cannot explain.</li>
                            <li>Ignoring grammar mistakes.</li>
                            <li>Applying without researching the company.</li>
                            <li>Having no GitHub or portfolio.</li>
                        </ul>
                    </section>


                    <section className="learningHubSection">
                        <h3>💡 Final Advice</h3>

                        <p>
                            Every experienced developer started as a beginner. Employers are not looking for someone who knows everything—they're looking for someone who is willing to learn, solve problems, and grow. Focus on building projects, improving your skills, and continuously learning. Small improvements made consistently will have a big impact on your career.
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
