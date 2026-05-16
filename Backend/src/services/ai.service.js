const Groq = require("groq-sdk")

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
})

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
    const prompt = `Generate an interview report for a candidate with the following details:
Resume: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}

Respond ONLY with a valid JSON object (no markdown, no backticks) with this exact structure:
{
  "matchScore": <number 0-100>,
  "title": "<job title string>",
  "technicalQuestions": [
    { "question": "<string>", "intention": "<string>", "answer": "<string>" }
  ],
  "behavioralQuestions": [
    { "question": "<string>", "intention": "<string>", "answer": "<string>" }
  ],
  "skillGaps": [
    { "skill": "<string>", "severity": "<low|medium|high>" }
  ],
  "preparationPlan": [
    { "day": <number>, "focus": "<string>", "tasks": ["<string>"] }
  ]
}

Include 5 technical questions, 5 behavioral questions, 3-5 skill gaps, and a 7-day preparation plan.`

    const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 4000,
    })

    const text = response.choices[0].message.content.trim()
    const clean = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim()
    return JSON.parse(clean)
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {
    const { jsPDF } = require("jspdf")

    const prompt = `Generate a professional resume as plain text for a candidate with these details:
Resume/Experience: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}

Respond ONLY with a valid JSON object (no markdown, no backticks):
{ 
  "name": "<full name>",
  "email": "<email>",
  "phone": "<phone>",
  "summary": "<professional summary>",
  "skills": ["<skill1>", "<skill2>"],
  "experience": [{ "title": "<title>", "company": "<company>", "duration": "<duration>", "points": ["<point1>"] }],
  "education": [{ "degree": "<degree>", "institution": "<institution>", "year": "<year>" }],
  "projects": [{ "name": "<name>", "description": "<description>", "tech": "<tech stack>" }]
}`

    const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 4000,
    })

    const text = response.choices[0].message.content.trim()
    const clean = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim()
    const data = JSON.parse(clean)

    const doc = new jsPDF()
    let y = 20

    const addLine = (text, size = 11, bold = false) => {
        doc.setFontSize(size)
        doc.setFont("helvetica", bold ? "bold" : "normal")
        const lines = doc.splitTextToSize(text, 180)
        lines.forEach(line => {
            if (y > 270) { doc.addPage(); y = 20 }
            doc.text(line, 15, y)
            y += size * 0.5 + 2
        })
    }

    const addSection = (title) => {
        y += 4
        addLine(title, 13, true)
        doc.setDrawColor(200)
        doc.line(15, y, 195, y)
        y += 4
    }

    // Header
    addLine(data.name || "Resume", 18, true)
    if (data.email || data.phone) {
        addLine(`${data.email || ""} | ${data.phone || ""}`, 10)
    }

    // Summary
    if (data.summary) {
        addSection("PROFESSIONAL SUMMARY")
        addLine(data.summary)
    }

    // Skills
    if (data.skills?.length) {
        addSection("SKILLS")
        addLine(data.skills.join(" • "))
    }

    // Experience
    if (data.experience?.length) {
        addSection("EXPERIENCE")
        data.experience.forEach(exp => {
            addLine(`${exp.title} — ${exp.company} (${exp.duration})`, 11, true)
            exp.points?.forEach(p => addLine(`• ${p}`, 10))
            y += 2
        })
    }

    // Projects
    if (data.projects?.length) {
        addSection("PROJECTS")
        data.projects.forEach(proj => {
            addLine(`${proj.name} | ${proj.tech}`, 11, true)
            addLine(proj.description, 10)
            y += 2
        })
    }

    // Education
    if (data.education?.length) {
        addSection("EDUCATION")
        data.education.forEach(edu => {
            addLine(`${edu.degree} — ${edu.institution} (${edu.year})`)
        })
    }

    return Buffer.from(doc.output("arraybuffer"))
}

module.exports = { generateInterviewReport, generateResumePdf }