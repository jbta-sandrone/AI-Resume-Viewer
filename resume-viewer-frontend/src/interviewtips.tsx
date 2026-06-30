import React from 'react'

type ResumeSectionsProps = {
    onBack: () => void
    onOpenAnalyzer: () => void
}

export default function InterviewTips({ onBack, onOpenAnalyzer }: ResumeSectionsProps) {
    return (
        <div className="learningHubArticle">
            <div className="learningHubArticleShell">
                <button type="button" className="buttonSmall" onClick={onBack} style={{ marginBottom: 16 }}>
                    ← Back to Learning Hub
                </button>

                <header className="learningHubArticleHeader">
                    <div>
                        <div className="muted2">Resume Learning Hub</div>
                        <h2 className="learningHubLessonTitle">Interview Tips</h2>
                        <p className="learningHubIntro">
                            Learn how to prepare for interviews, answer questions confidently, and make a strong first impression on potential employers.
                        </p>
                    </div>
                </header>

                <article className="learningHubArticleBody">

                    <section className="learningHubSection">
                        <h3>🎤 Why Interview Preparation Matters</h3>
                        <p>
                            A well-written resume may get you an interview, but your interview performance determines whether you receive the job offer. Interview preparation helps you communicate confidently, demonstrate your skills, and leave a positive impression on employers.
                        </p>
                    </section>

                    <hr style={{ border: '1px solid rgba(245, 158, 11, 0.18)' }}></hr>

                    <section className="learningHubSection">
                        <h3>1. Before the Interview</h3>

                        <p>Preparation begins before you enter the interview room.</p>

                        <ul className="learningHubChecklist">
                            <li>Research the company and its products or services.</li>
                            <li>Read the job description carefully.</li>
                            <li>Review your resume and projects.</li>
                            <li>Practice introducing yourself.</li>
                            <li>Prepare questions to ask the interviewer.</li>
                        </ul>
                    </section>

                    <hr style={{ border: '1px solid rgba(245, 158, 11, 0.18)' }}></hr>

                    <section className="learningHubSection">
                        <h3>2. Common Interview Questions</h3>

                        <div className="">
                            <strong>Frequently Asked Questions:</strong>

                            <ul className="learningHubChecklist">
                                <li>Tell me about yourself.</li>
                                <li>Why do you want to work here?</li>
                                <li>Why should we hire you?</li>
                                <li>What are your strengths?</li>
                                <li>What are your weaknesses?</li>
                                <li>Describe a challenging project.</li>
                                <li>Where do you see yourself in five years?</li>
                            </ul>
                        </div>
                    </section>

                    <hr style={{ border: '1px solid rgba(245, 158, 11, 0.18)' }}></hr>

                    <section className="learningHubSection">
                        <h3>3. Answer Using the STAR Method</h3>

                        <p>
                            The STAR Method helps you answer behavioral interview questions clearly and logically.
                        </p>

                        <div className="">
                            <strong>S - Situation</strong>
                            <div>Describe the situation.</div>

                            <br />

                            <strong>T - Task</strong>
                            <div>Explain your responsibility.</div>

                            <br />

                            <strong>A - Action</strong>
                            <div>Describe what you did.</div>

                            <br />

                            <strong>R - Result</strong>
                            <div>Explain the outcome or what you learned.</div>
                        </div>
                    </section>

                    <hr style={{ border: '1px solid rgba(245, 158, 11, 0.18)' }}></hr>

                    <section className="learningHubSection">
                        <h3>4. Technical Interviews</h3>

                        <p>
                            Technical interviews evaluate your knowledge, problem-solving ability, and understanding of the technologies listed on your resume.
                        </p>

                        <ul className="learningHubChecklist">
                            <li>Review your programming fundamentals.</li>
                            <li>Practice explaining your projects.</li>
                            <li>Understand every technology listed on your resume.</li>
                            <li>Be honest if you don't know an answer.</li>
                            <li>Explain your thought process while solving problems.</li>
                        </ul>
                    </section>

                    <hr style={{ border: '1px solid rgba(245, 158, 11, 0.18)' }}></hr>

                    <section className="learningHubSection">
                        <h3>5. Professional Communication</h3>

                        <p>
                            Good communication can leave a lasting impression even if you're nervous.
                        </p>

                        <ul className="learningHubChecklist">
                            <li>Speak clearly and confidently.</li>
                            <li>Maintain eye contact when appropriate.</li>
                            <li>Listen carefully before answering.</li>
                            <li>Avoid interrupting the interviewer.</li>
                            <li>Be polite and respectful throughout the interview.</li>
                        </ul>
                    </section>

                    <hr style={{ border: '1px solid rgba(245, 158, 11, 0.18)' }}></hr>

                    <section className="learningHubSection">
                        <h3>6. Common Interview Mistakes</h3>

                        <ul className="learningHubChecklist">
                            <li>Arriving late.</li>
                            <li>Not researching the company.</li>
                            <li>Giving overly short or overly long answers.</li>
                            <li>Speaking negatively about previous employers or classmates.</li>
                            <li>Exaggerating skills or experience.</li>
                            <li>Failing to ask questions at the end of the interview.</li>
                        </ul>
                    </section>

                    <hr style={{ border: '1px solid rgba(245, 158, 11, 0.18)' }}></hr>

                    <section className="learningHubSection">
                        <h3>7. Questions You Can Ask the Interviewer</h3>

                        <div className="">
                            <strong>Good Questions:</strong>

                            <ul className="learningHubChecklist">
                                <li>What does success look like in this role?</li>
                                <li>What technologies does the team use?</li>
                                <li>What opportunities are available for learning and growth?</li>
                                <li>Can you describe the team I would be working with?</li>
                            </ul>
                        </div>
                    </section>

                    <hr style={{ border: '1px solid rgba(245, 158, 11, 0.18)' }}></hr>

                    <section className="learningHubSection">
                        <h3>8. Virtual Interview Tips</h3>

                        <ul className="learningHubChecklist">
                            <li>Test your internet connection beforehand.</li>
                            <li>Check your microphone and camera.</li>
                            <li>Choose a quiet and well-lit location.</li>
                            <li>Close unnecessary applications.</li>
                            <li>Join the meeting a few minutes early.</li>
                        </ul>
                    </section>

                    <hr style={{ border: '1px solid rgba(245, 158, 11, 0.18)' }}></hr>                  

                    <section className="learningHubSection">
                        <h3>💡 Final Advice</h3>

                        <p>
                            Interviewers do not expect fresh graduates to know everything. They value honesty, curiosity, problem-solving, and a willingness to learn. If you don't know an answer, explain how you would approach the problem instead of guessing. Confidence comes from preparation, so practice your answers, review your projects, and believe in the effort you've put into building your skills.
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
