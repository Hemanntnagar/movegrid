'use client'

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bot, Loader2, MessageCircle, Send, X } from 'lucide-react'
import { getStoredToken, movegridApi, type ApiCoachChatContext } from '../lib/api'
import { getStoredPlan, goalLabel, type FitnessGoal } from '../lib/fitnessPlan'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const HIDDEN_PATHS = new Set(['/login', '/signup'])

function newId() {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

const GREETING: ChatMessage = {
  id: 'greet',
  role: 'assistant',
  content:
    "Hey — I'm Grid Coach. Stuck on a workout, low on motivation, or need help fitting movement into your day? Ask me anything.",
}

export function GridCoach() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const hidden = HIDDEN_PATHS.has(pathname)

  const context = useMemo((): ApiCoachChatContext | undefined => {
    const plan = getStoredPlan()
    if (!plan) return undefined
    return {
      fitness_level: plan.fitnessLevel,
      goal: goalLabel(plan.goal as FitnessGoal),
      daily_minutes: plan.dailyMinutes,
      focus_areas: plan.focusAreas,
    }
  }, [open, messages.length])

  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages, open, sending])

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [open])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || sending) return

    const userMsg: ChatMessage = { id: newId(), role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setSending(true)

    try {
      const history = messages
        .filter((m) => m.id !== 'greet')
        .slice(-20)
        .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))

      const { reply } = await movegridApi.coachChat(
        {
          message: text,
          history,
          context,
        },
        getStoredToken(),
      )
      setMessages((prev) => [...prev, { id: newId(), role: 'assistant', content: reply }])
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Could not send message'
      setMessages((prev) => [
        ...prev,
        { id: newId(), role: 'assistant', content: detail },
      ])
    } finally {
      setSending(false)
    }
  }, [context, input, messages, sending])

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void send()
  }

  if (hidden) return null

  return (
    <div className={`grid-coach ${open ? 'grid-coach-open' : ''}`} aria-live="polite">
      {open && (
        <section className="grid-coach-panel" aria-label="Grid Coach chat">
          <header className="grid-coach-header">
            <div>
              <p className="eyebrow">MOVEGRID</p>
              <strong>Grid Coach</strong>
            </div>
            <button type="button" className="grid-coach-close" onClick={() => setOpen(false)} aria-label="Close coach">
              <X size={18} />
            </button>
          </header>
          <div className="grid-coach-messages" ref={listRef}>
            {messages.map((msg) => (
              <div key={msg.id} className={`grid-coach-bubble grid-coach-bubble-${msg.role}`}>
                {msg.role === 'assistant' && (
                  <span className="grid-coach-avatar" aria-hidden>
                    <Bot size={14} />
                  </span>
                )}
                <p>{msg.content}</p>
              </div>
            ))}
            {sending && (
              <div className="grid-coach-bubble grid-coach-bubble-assistant grid-coach-typing">
                <Loader2 size={16} className="spin" aria-hidden />
                <span>Thinking…</span>
              </div>
            )}
          </div>
          <form className="grid-coach-form" onSubmit={onSubmit}>
            <textarea
              ref={inputRef}
              rows={2}
              value={input}
              placeholder="Describe your problem or ask for advice…"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
              disabled={sending}
            />
            <button type="submit" className="grid-coach-send" disabled={sending || !input.trim()} aria-label="Send">
              <Send size={16} />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="grid-coach-fab"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Close Grid Coach' : 'Open Grid Coach'}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        <span>Grid Coach</span>
      </button>
    </div>
  )
}
