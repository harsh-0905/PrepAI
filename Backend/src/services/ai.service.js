async function generateResumePdf({ resume, selfDescription, jobDescription }) {
    const { jsPDF } = require("jspdf")

    const prompt = `Generate a professional resume for a candidate with these details:
Resume/Experience: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}

Respond ONLY with a valid JSON object (no markdown, no backticks):
{ 
  "name": "<full name>",
  "email": "<email>",
  "phone": "<phone>",
  "location": "<city, country>",
  "linkedin": "<linkedin url or empty>",
  "github": "<github url or empty>",
  "summary": "<2-3 line professional summary tailored to job>",
  "skills": ["<skill1>", "<skill2>", "<skill3>"],
  "experience": [{ "title": "<title>", "company": "<company>", "duration": "<duration>", "points": ["<point1>", "<point2>"] }],
  "education": [{ "degree": "<degree>", "institution": "<institution>", "year": "<year>", "grade": "<grade or CGPA>" }],
  "projects": [{ "name": "<name>", "description": "<2 line description>", "tech": "<tech stack>", "link": "<live link or empty>" }],
  "certifications": ["<cert1>", "<cert2>"]
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

    const doc = new jsPDF({ unit: "mm", format: "a4" })
    const W = 210
    const margin = 15
    const contentW = W - margin * 2
    let y = 0

    const checkPage = (needed = 8) => {
        if (y + needed > 280) { doc.addPage(); y = 15 }
    }

    // ── HEADER BACKGROUND ──
    doc.setFillColor(30, 58, 95)
    doc.rect(0, 0, W, 42, "F")

    // Name
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont("helvetica", "bold")
    doc.text(data.name || "Resume", margin, 16)

    // Contact line
    doc.setFontSize(8.5)
    doc.setFont("helvetica", "normal")
    const contacts = [data.email, data.phone, data.location, data.linkedin, data.github]
        .filter(Boolean).join("  |  ")
    doc.text(contacts, margin, 24)

    // Summary in header
    if (data.summary) {
        doc.setFontSize(9)
        const summaryLines = doc.splitTextToSize(data.summary, contentW)
        doc.text(summaryLines, margin, 32)
    }

    y = 50
    doc.setTextColor(0, 0, 0)

    const sectionTitle = (title) => {
        checkPage(12)
        y += 3
        doc.setFillColor(30, 58, 95)
        doc.rect(margin, y, contentW, 7, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(10)
        doc.setFont("helvetica", "bold")
        doc.text(title, margin + 3, y + 5)
        doc.setTextColor(0, 0, 0)
        y += 10
    }

    const bulletLine = (text, indent = margin + 4) => {
        checkPage(6)
        doc.setFontSize(9)
        doc.setFont("helvetica", "normal")
        const lines = doc.splitTextToSize(`• ${text}`, contentW - 6)
        lines.forEach(line => {
            doc.text(line, indent, y)
            y += 5
        })
    }

    const normalLine = (text, size = 9, bold = false) => {
        checkPage(6)
        doc.setFontSize(size)
        doc.setFont("helvetica", bold ? "bold" : "normal")
        const lines = doc.splitTextToSize(text, contentW)
        lines.forEach(line => {
            doc.text(line, margin, y)
            y += size * 0.45 + 2
        })
    }

    // ── SKILLS ──
    if (data.skills?.length) {
        sectionTitle("TECHNICAL SKILLS")
        const skillGroups = []
        for (let i = 0; i < data.skills.length; i += 6) {
            skillGroups.push(data.skills.slice(i, i + 6).join("  •  "))
        }
        skillGroups.forEach(g => normalLine(g))
        y += 2
    }

    // ── EXPERIENCE ──
    if (data.experience?.length) {
        sectionTitle("WORK EXPERIENCE")
        data.experience.forEach(exp => {
            checkPage(10)
            doc.setFontSize(10)
            doc.setFont("helvetica", "bold")
            doc.text(`${exp.title}`, margin, y)
            doc.setFont("helvetica", "normal")
            doc.setFontSize(9)
            doc.setTextColor(80, 80, 80)
            doc.text(`${exp.company}  |  ${exp.duration}`, margin, y + 5)
            doc.setTextColor(0, 0, 0)
            y += 9
            exp.points?.forEach(p => bulletLine(p))
            y += 2
        })
    }

    // ── PROJECTS ──
    if (data.projects?.length) {
        sectionTitle("PROJECTS")
        data.projects.forEach(proj => {
            checkPage(12)
            doc.setFontSize(10)
            doc.setFont("helvetica", "bold")
            const projTitle = proj.link ? `${proj.name}  →  ${proj.link}` : proj.name
            doc.text(projTitle, margin, y)
            y += 5
            doc.setFontSize(9)
            doc.setFont("helvetica", "italic")
            doc.setTextColor(80, 80, 80)
            doc.text(`Tech: ${proj.tech}`, margin, y)
            doc.setTextColor(0, 0, 0)
            doc.setFont("helvetica", "normal")
            y += 5
            bulletLine(proj.description)
            y += 2
        })
    }

    // ── EDUCATION ──
    if (data.education?.length) {
        sectionTitle("EDUCATION")
        data.education.forEach(edu => {
            checkPage(10)
            doc.setFontSize(10)
            doc.setFont("helvetica", "bold")
            doc.text(edu.degree, margin, y)
            doc.setFont("helvetica", "normal")
            doc.setFontSize(9)
            doc.setTextColor(80, 80, 80)
            doc.text(`${edu.institution}  |  ${edu.year}  ${edu.grade ? `| ${edu.grade}` : ""}`, margin, y + 5)
            doc.setTextColor(0, 0, 0)
            y += 12
        })
    }

    // ── CERTIFICATIONS ──
    if (data.certifications?.length) {
        sectionTitle("CERTIFICATIONS")
        data.certifications.forEach(cert => bulletLine(cert))
    }

    return Buffer.from(doc.output("arraybuffer"))
}