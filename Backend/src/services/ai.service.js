async function generateResumePdf({ resume, selfDescription, jobDescription }) {
    const puppeteer = require("puppeteer-core")
    const chromium = require("@sparticuz/chromium")

    const prompt = `Generate a professional resume in HTML for a candidate with these details:
Resume/Experience: ${resume}
Self Description: ${selfDescription}
Job Description: ${jobDescription}

Respond ONLY with a valid JSON object (no markdown, no backticks):
{ "html": "<full HTML string of the resume>" }

The HTML should be well-formatted, ATS-friendly, inline CSS only, 1-2 pages when printed, tailored to the job description.`

    const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 4000,
    })

    const text = response.choices[0].message.content.trim()
    const clean = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim()
    const { html } = JSON.parse(clean)

    const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
    })

    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle0" })
    const pdfBuffer = await page.pdf({
        format: "A4",
        margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" }
    })
    await browser.close()
    return pdfBuffer
}