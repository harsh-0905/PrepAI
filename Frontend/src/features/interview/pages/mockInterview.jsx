import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router'
import { sendMockInterviewMessage } from '../services/interview.api'
import './MockInterview.scss'

// ── Web Speech API helpers ───────────────────────────────────────────

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
const browserSupportsSpeech = !!SpeechRecognition

function speakText(text, onEnd) {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    // Strip markdown symbols so TTS sounds natural
    const clean = text
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/---/g, '')
        .replace(/- /g, '')
        .replace(/→/g, 'means')
        .trim()
    const utterance = new SpeechSynthesisUtterance(clean)
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.volume = 1.0
    // Pick a decent voice if available
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v =>
        v.name.includes('Google UK English Male') ||
        v.name.includes('Google US English') ||
        v.name.includes('Daniel') ||
        v.lang === 'en-US'
    )
    if (preferred) utterance.voice = preferred
    if (onEnd) utterance.onend = onEnd
    window.speechSynthesis.speak(utterance)
}

// ── Markdown renderer (minimal, no dependency) ───────────────────────

function renderMarkdown(text) {
    const lines = text.split('\n')
    const elements = []
    let key = 0

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]

        if (/^## (.+)/.test(line)) {
            elements.push(<h2 key={key++} className="md-h2">{line.replace(/^## /, '')}</h2>)
        } else if (/^### (.+)/.test(line)) {
            elements.push(<h3 key={key++} className="md-h3">{line.replace(/^### /, '')}</h3>)
        } else if (/^---$/.test(line)) {
            elements.push(<hr key={key++} className="md-hr" />)
        } else if (/^- (.+)/.test(line)) {
            elements.push(<li key={key++} className="md-li">{renderInline(line.replace(/^- /, ''))}</li>)
        } else if (line.trim() === '') {
            elements.push(<div key={key++} className="md-spacer" />)
        } else {
            elements.push(<p key={key++} className="md-p">{renderInline(line)}</p>)
        }
    }
    return elements
}

function renderInline(text) {
    const parts = text.split(/(\*\*[^*]+\*\*)/)
    return parts.map((part, i) => {
        if (/^\*\*[^*]+\*\*$/.test(part)) {
            return <strong key={i}>{part.replace(/\*\*/g, '')}</strong>
        }
        return part
    })
}

// ── Component ────────────────────────────────────────────────────────

const MockInterview = () => {
    const { interviewId } = useParams()
    const navigate = useNavigate()

    const [messages, setMessages] = useState([])
    const [input, setInput] = useState("")
    const [loading, setLoading] = useState(false)
    const [isStarted, setIsStarted] = useState(false)
    const [isFinished, setIsFinished] = useState(false)
    const [error, setError] = useState("")

    // Voice state
    const [voiceEnabled, setVoiceEnabled] = useState(browserSupportsSpeech)
    const [ttsEnabled, setTtsEnabled] = useState(true)
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState("")

    const recognitionRef = useRef(null)
    const bottomRef = useRef(null)
    const isSpeakingRef = useRef(false)

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, loading])

    // Load voices (Chrome needs this async)
    useEffect(() => {
        if (window.speechSynthesis) {
            window.speechSynthesis.getVoices()
            window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
        }
        return () => {
            window.speechSynthesis?.cancel()
            recognitionRef.current?.stop()
        }
    }, [])

    const sendMessage = useCallback(async (userText, finish = false) => {
        if (loading) return

        window.speechSynthesis?.cancel()
        isSpeakingRef.current = false

        const newMessages = userText
            ? [...messages, { role: "user", content: userText }]
            : messages

        if (userText) setMessages(newMessages)
        setInput("")
        setTranscript("")
        setLoading(true)
        setError("")

        try {
            const data = await sendMockInterviewMessage({
                interviewReportId: interviewId,
                messages: newMessages,
                isFinished: finish
            })

            const reply = data.reply
            setMessages(prev => [...prev, { role: "assistant", content: reply }])

            if (finish) {
                setIsFinished(true)
            }

            // Speak the AI reply if TTS is on
            if (ttsEnabled && !finish) {
                isSpeakingRef.current = true
                speakText(reply, () => { isSpeakingRef.current = false })
            }

        } catch (err) {
            setError("Failed to get a response. Please try again.")
        } finally {
            setLoading(false)
        }
    }, [loading, messages, interviewId, ttsEnabled])

    // ── Speech recognition ───────────────────────────────────────────

    const startListening = () => {
        if (!browserSupportsSpeech || isListening || loading) return

        window.speechSynthesis?.cancel()
        isSpeakingRef.current = false

        const recognition = new SpeechRecognition()
        recognition.lang = 'en-US'
        recognition.interimResults = true
        recognition.continuous = false
        recognitionRef.current = recognition

        recognition.onstart = () => setIsListening(true)

        recognition.onresult = (event) => {
            let interim = ''
            let final = ''
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const t = event.results[i][0].transcript
                if (event.results[i].isFinal) final += t
                else interim += t
            }
            setTranscript(final || interim)
            if (final) setInput(prev => prev + (prev ? ' ' : '') + final)
        }

        recognition.onerror = (e) => {
            if (e.error !== 'no-speech') setError(`Mic error: ${e.error}`)
            setIsListening(false)
            setTranscript("")
        }

        recognition.onend = () => {
            setIsListening(false)
            setTranscript("")
        }

        recognition.start()
    }

    const stopListening = () => {
        recognitionRef.current?.stop()
        setIsListening(false)
    }

    const handleMicClick = () => {
        if (isListening) stopListening()
        else startListening()
    }

    // ── Handlers ─────────────────────────────────────────────────────

    const handleStart = () => {
        setIsStarted(true)
        sendMessage("")
    }

    const handleSubmit = (e) => {
        e?.preventDefault()
        const text = input.trim()
        if (!text || loading) return
        sendMessage(text)
    }

    const handleFinish = () => {
        stopListening()
        sendMessage("", true)
    }

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
    }

    const answerCount = messages.filter(m => m.role === "user").length

    // ── Render ───────────────────────────────────────────────────────

    return (
        <div className="mock-page">

            {/* Header */}
            <header className="mock-header">
                <button className="mock-back-btn" onClick={() => { window.speechSynthesis?.cancel(); navigate(`/interview/${interviewId}`) }}>
                    ← Back
                </button>
                <h1 className="mock-header__title">Mock Interview</h1>
                <div className="mock-header__controls">
                    {isStarted && !isFinished && (
                        <span className="mock-pill">{answerCount} ans</span>
                    )}
                    {browserSupportsSpeech && isStarted && !isFinished && (
                        <button
                            className={`mock-tts-btn ${ttsEnabled ? 'mock-tts-btn--on' : ''}`}
                            onClick={() => { setTtsEnabled(v => !v); window.speechSynthesis?.cancel() }}
                            title={ttsEnabled ? "Turn off interviewer voice" : "Turn on interviewer voice"}
                        >
                            {ttsEnabled ? '🔊' : '🔇'}
                        </button>
                    )}
                </div>
            </header>

            {/* Body */}
            <main className="mock-body">

                {/* ── Start screen ── */}
                {!isStarted && (
                    <div className="mock-start">
                        <div className="mock-start__icon">🎙️</div>
                        <h2>Ready for your mock interview?</h2>
                        <p>The AI interviewer asks questions one at a time. You can type or use your mic to answer. When you're done, tap "End & Get Feedback" for a full evaluation.</p>
                        <ul className="mock-start__tips">
                            <li>Answer fully — vague answers get follow-up questions</li>
                            <li>3–4 technical + 2 behavioral questions total</li>
                            {browserSupportsSpeech && <li>Tap the mic button to speak your answers</li>}
                            <li>End the interview anytime after 2 answers</li>
                        </ul>
                        {!browserSupportsSpeech && (
                            <p className="mock-start__warning">⚠ Voice input not supported in this browser. Use Chrome or Edge for voice.</p>
                        )}
                        <button className="mock-primary-btn" onClick={handleStart}>
                            Start Interview
                        </button>
                    </div>
                )}

                {/* ── Chat ── */}
                {isStarted && (
                    <div className="mock-chat">

                        {/* Messages */}
                        <div className="mock-chat__messages">
                            {messages.map((msg, i) => (
                                <div key={i} className={`mock-msg mock-msg--${msg.role}`}>
                                    <span className="mock-msg__label">
                                        {msg.role === "assistant" ? "Interviewer" : "You"}
                                    </span>
                                    <div className="mock-msg__bubble">
                                        {msg.role === "assistant"
                                            ? <div className="mock-msg__markdown">{renderMarkdown(msg.content)}</div>
                                            : <p>{msg.content}</p>
                                        }
                                    </div>
                                </div>
                            ))}

                            {/* Typing indicator */}
                            {loading && (
                                <div className="mock-msg mock-msg--assistant">
                                    <span className="mock-msg__label">Interviewer</span>
                                    <div className="mock-msg__bubble mock-msg__bubble--typing">
                                        <span /><span /><span />
                                    </div>
                                </div>
                            )}

                            {error && <div className="mock-error">⚠ {error}</div>}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input area — hidden after finished */}
                        {!isFinished && (
                            <div className="mock-chat__footer">

                                {/* Live transcript preview */}
                                {isListening && transcript && (
                                    <div className="mock-transcript">
                                        🎤 {transcript}
                                    </div>
                                )}

                                <div className="mock-chat__input-row">
                                    {/* Mic button */}
                                    {browserSupportsSpeech && (
                                        <button
                                            type="button"
                                            className={`mock-mic-btn ${isListening ? 'mock-mic-btn--active' : ''}`}
                                            onClick={handleMicClick}
                                            disabled={loading}
                                            title={isListening ? "Stop listening" : "Speak your answer"}
                                        >
                                            {isListening ? '⏹' : '🎤'}
                                        </button>
                                    )}

                                    {/* Text input */}
                                    <textarea
                                        className="mock-chat__textarea"
                                        value={input}
                                        onChange={e => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={isListening ? "Listening..." : "Type or use mic to answer..."}
                                        disabled={loading}
                                        rows={2}
                                    />

                                    {/* Send */}
                                    <button
                                        type="button"
                                        className="mock-send-btn"
                                        onClick={handleSubmit}
                                        disabled={loading || !input.trim()}
                                        title="Send answer"
                                    >
                                        ➤
                                    </button>
                                </div>

                                {/* Action row */}
                                <div className="mock-chat__actions">
                                    <span className="mock-chat__hint">Enter to send · Shift+Enter for new line</span>
                                    <button
                                        type="button"
                                        className="mock-end-btn"
                                        onClick={handleFinish}
                                        disabled={loading || answerCount < 2}
                                        title={answerCount < 2 ? "Answer at least 2 questions first" : "End and get feedback"}
                                    >
                                        End & Get Feedback
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Post-finish CTA */}
                        {isFinished && (
                            <div className="mock-chat__done">
                                <p>Interview complete. Review your feedback above.</p>
                                <button className="mock-primary-btn" onClick={() => navigate(`/interview/${interviewId}`)}>
                                    Back to Report
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}

export default MockInterview