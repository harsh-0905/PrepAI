import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000",
    withCredentials: true,
})

export const generateInterviewReport = async ({ jobDescription, selfDescription, resumeFile }) => {
    const formData = new FormData()
    formData.append("jobDescription", jobDescription)
    formData.append("selfDescription", selfDescription)
    if (resumeFile) formData.append("resume", resumeFile)
    const response = await api.post("/api/interview/", formData, {
        headers: { "Content-Type": "multipart/form-data" }
    })
    return response.data
}

export const getInterviewReportById = async (interviewId) => {
    const response = await api.get(`/api/interview/report/${interviewId}`)
    return response.data
}

export const getAllInterviewReports = async () => {
    const response = await api.get("/api/interview/")
    return response.data
}

export const generateResumePdf = async ({ interviewReportId }) => {
    const response = await api.post(`/api/interview/resume/pdf/${interviewReportId}`, null, {
        responseType: "blob"
    })
    return response.data
}

export const sendMockInterviewMessage = async ({ interviewReportId, messages, isFinished = false }) => {
    const response = await api.post(`/api/interview/mock/${interviewReportId}/chat`, {
        messages,
        isFinished
    })
    return response.data
}