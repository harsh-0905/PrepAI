const Groq = require("groq-sdk")
const interviewReportModel = require("../models/interviewReport.model")

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

async function mockInterviewChatController(req, res) {
    try {
        const { interviewReportId } = req.params
        const { messages = [], isFinished = false } = req.body

        const report = await interviewReportModel.findOne({
            _id: interviewReportId,
            user: req.user.id
        })

        if (!report) {
            return res.status(404).json({ message: "Interview report not found." })
        }

        const techQs = report.technicalQuestions.map(q => q.question).join("\n- ")
        const behavQs = report.behavioralQuestions.map(q => q.question).join("\n- ")
        const skillGaps = report.skillGaps.map(g => `${g.skill} (${g.severity})`).join(", ")

        const systemPrompt = isFinished
            ? `You are a professional technical interviewer. The mock interview is now complete.

Based on the full conversation history, generate a detailed evaluation report.

Format your response EXACTLY like this (use these exact headings):

## Interview Complete

**Overall Score: X/10**

---

### Technical Performance
[2-3 sentences on how they handled technical questions. Be specific — mention actual answers they gave.]

**Technical Score: X/10**

---

### Communication
[2-3 sentences on clarity, structure, and confidence shown in their answers.]

**Communication Score: X/10**

---

### Strengths
- [Specific strength with example from their answer]
- [Specific strength with example from their answer]
- [Specific strength with example from their answer]

---

### Weaknesses & What to Improve
- [Specific weak area] → [Concrete action to fix it]
- [Specific weak area] → [Concrete action to fix it]
- [Specific weak area] → [Concrete action to fix it]

---

### Final Verdict
**[Ready to Interview / Needs More Preparation / Not Ready]**

[2-3 sentences with final honest advice for this candidate targeting the role of ${report.title}.]

Be honest and direct. Reference actual things they said. Do not be generic.`
            : `You are a professional technical interviewer conducting a mock interview for the role: "${report.title}".

CANDIDATE CONTEXT:
- Job Description: ${report.jobDescription.slice(0, 600)}
- Skill Gaps: ${skillGaps}

TECHNICAL QUESTIONS to draw from:
- ${techQs}

BEHAVIORAL QUESTIONS to draw from:
- ${behavQs}

RULES:
1. Ask ONE question at a time. Never combine questions.
2. After each answer, give a one-sentence acknowledgment, then ask the next question or a follow-up.
3. If the answer is vague or weak, ask one natural follow-up like a real interviewer.
4. If the answer is strong, increase difficulty slightly.
5. Cover 3-4 technical questions and 2 behavioral questions total.
6. Keep your responses short — interviewer messages should be 2-4 sentences max.
7. On your first message, introduce yourself briefly and ask the first question immediately.
8. Do NOT give scores or feedback during the interview. Save that for the end.
9. Sound human and professional, not robotic.`

        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: systemPrompt },
                ...messages
            ],
            temperature: isFinished ? 0.5 : 0.7,
            max_tokens: isFinished ? 1000 : 400,
        })

        const reply = response.choices[0].message.content.trim()

        res.status(200).json({ reply })

    } catch (error) {
        console.error("mockInterviewChatController error:", error)
        res.status(500).json({ message: "Internal server error.", error: error.message })
    }
}

module.exports = { mockInterviewChatController }