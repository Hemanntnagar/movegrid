/**
 * Server-side plan generation (Vercel demo mode when no Python API is configured).
 * Mirrors backend/app/services/plan_generation_service.py.
 */

export type PlanAnswers = {
  fitness_level: string
  goal: string
  daily_minutes: number
  preferred_windows: string[]
  focus_areas: string[]
}

const FOCUS_AREAS = new Set(['Cardio', 'Strength', 'Core', 'Walking', 'Mobility'])
const TIME_WINDOWS = new Set(['Morning', 'Midday', 'Evening'])
const GOAL_LABELS: Record<string, string> = {
  strength: 'Build strength',
  weight: 'Lose weight / burn calories',
  active: 'Stay active daily',
  flexibility: 'Improve flexibility',
}
const WINDOW_TIMES: Record<string, string[]> = {
  Morning: ['07:00', '07:30', '08:00'],
  Midday: ['12:00', '12:30', '13:00'],
  Evening: ['17:30', '18:00', '18:30', '19:00'],
}

const SYSTEM_PROMPT = `You are MOVEGRID's fitness coach. Create a realistic daily movement timetable for one person.
Rules:
- Use only bodyweight or no-equipment activities.
- Match difficulty to the user's fitness level.
- Align exercises with their goal and chosen focus areas.
- Place each slot at a time within their preferred time windows (24h HH:MM).
- Total scheduled minutes should be close to their daily budget (within about 10 minutes).
- Return 2 to 4 slots.
- Categories must be one of: Cardio, Strength, Core, Walking, Mobility.
- Notes should be brief coaching cues (one sentence).
Respond with JSON only, no markdown.`

function normalizeAnswers(raw: Record<string, unknown>): PlanAnswers {
  const levelRaw = String(raw.fitness_level ?? raw.fitnessLevel ?? 'Beginner').trim()
  const level = ['Beginner', 'Intermediate', 'Advanced'].includes(levelRaw) ? levelRaw : 'Beginner'
  const goal = String(raw.goal ?? 'active').trim().toLowerCase()
  const safeGoal = goal in GOAL_LABELS ? goal : 'active'
  const dailyMinutes = Math.max(15, Math.min(120, Number(raw.daily_minutes ?? raw.dailyMinutes ?? 30) || 30))
  const windowsRaw = (raw.preferred_windows ?? raw.preferredWindows ?? ['Morning', 'Evening']) as string[]
  const windows = windowsRaw.filter((w) => TIME_WINDOWS.has(w))
  const focusRaw = (raw.focus_areas ?? raw.focusAreas ?? ['Walking', 'Strength']) as string[]
  const focus = focusRaw.filter((f) => FOCUS_AREAS.has(f))
  return {
    fitness_level: level,
    goal: safeGoal,
    daily_minutes: dailyMinutes,
    preferred_windows: windows.length ? windows : ['Morning', 'Evening'],
    focus_areas: focus.length ? focus : ['Walking', 'Strength'],
  }
}

function userPrompt(answers: PlanAnswers): string {
  return (
    `Fitness level: ${answers.fitness_level}\n` +
    `Primary goal: ${GOAL_LABELS[answers.goal]}\n` +
    `Daily time budget: ${answers.daily_minutes} minutes\n` +
    `Preferred time windows: ${answers.preferred_windows.join(', ')}\n` +
    `Focus areas: ${answers.focus_areas.join(', ')}\n\n` +
    'JSON shape: {"schedule":[{"time":"07:00","title":"...","duration":15,"category":"Walking","notes":"..."}]}'
  )
}

function parseSchedule(content: string): Record<string, unknown>[] {
  let text = content.trim()
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')
  }
  const data = JSON.parse(text) as unknown
  if (Array.isArray(data)) return data as Record<string, unknown>[]
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>
    const schedule = obj.schedule ?? obj.slots
    if (Array.isArray(schedule)) return schedule as Record<string, unknown>[]
  }
  throw new Error('empty schedule')
}

function coerceSlot(raw: Record<string, unknown>, index: number, answers: PlanAnswers) {
  let category = String(raw.category ?? answers.focus_areas[index % answers.focus_areas.length])
  if (!FOCUS_AREAS.has(category)) category = answers.focus_areas[0]
  const window = answers.preferred_windows[index % answers.preferred_windows.length]
  const times = WINDOW_TIMES[window]
  let timeVal = String(raw.time ?? times[Math.min(index, times.length - 1)])
  if (!/^\d{2}:\d{2}$/.test(timeVal)) timeVal = times[Math.min(index, times.length - 1)]
  let duration = Math.max(5, Math.min(90, Number(raw.duration) || 15))
  const title = String(raw.title ?? `${category} session`).trim().slice(0, 120)
  const notes = String(raw.notes ?? `${window} · tailored to your goal.`).trim().slice(0, 280)
  return {
    id: `slot_${index}_${Math.abs(title.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % 10_000_000}`,
    time: timeVal,
    title,
    duration,
    category,
    notes,
  }
}

function balanceDurations(slots: ReturnType<typeof coerceSlot>[], target: number) {
  if (!slots.length) return slots
  const total = slots.reduce((s, slot) => s + slot.duration, 0)
  if (total === target || total <= 0) return [...slots].sort((a, b) => a.time.localeCompare(b.time))
  const ratio = target / total
  const adjusted = slots.map((slot) => ({
    ...slot,
    duration: Math.max(5, Math.round((slot.duration * ratio) / 5) * 5),
  }))
  let diff = target - adjusted.reduce((s, slot) => s + slot.duration, 0)
  let i = 0
  while (diff !== 0 && i < 40) {
    const step = diff > 0 ? 5 : -5
    const idx = i % adjusted.length
    const next = adjusted[idx].duration + step
    if (next >= 5) {
      adjusted[idx].duration = next
      diff -= step
    }
    i += 1
  }
  return adjusted.sort((a, b) => a.time.localeCompare(b.time))
}

function fallbackSchedule(answers: PlanAnswers) {
  const { fitness_level: level, goal, focus_areas: focus, preferred_windows: windows, daily_minutes } = answers
  const slotCount = Math.min(4, Math.max(2, windows.length, focus.length >= 2 ? focus.length : 2))
  const perSlot = Math.max(5, Math.floor(daily_minutes / slotCount))
  const goalPrefix: Record<string, string> = {
    strength: 'Strength-building',
    weight: 'Fat-burn',
    active: 'Energy',
    flexibility: 'Mobility-focused',
  }
  const intensity: Record<string, string> = {
    Beginner: 'gentle',
    Intermediate: 'moderate',
    Advanced: 'challenging',
  }
  const slots = Array.from({ length: slotCount }, (_, i) => {
    const area = focus[i % focus.length]
    const window = windows[i % windows.length]
    const times = WINDOW_TIMES[window]
    return coerceSlot(
      {
        time: times[Math.min(i, times.length - 1)],
        title: `${goalPrefix[goal] ?? 'Energy'} ${area.toLowerCase()} block (${intensity[level] ?? 'moderate'})`,
        duration: perSlot,
        category: area,
        notes: `${window} · Scaled for ${level.toLowerCase()} level toward ${GOAL_LABELS[goal]?.toLowerCase() ?? 'your goal'}.`,
      },
      i,
      answers,
    )
  })
  return balanceDurations(slots, daily_minutes)
}

function geminiModelId(raw: string) {
  const model = (raw || 'gemini-3.8-flash').trim()
  return model.startsWith('models/') ? model.slice('models/'.length) : model
}

async function geminiSchedule(answers: PlanAnswers, apiKey: string, model: string) {
  const modelId = geminiModelId(model)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt(answers) }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    }),
  })
  if (!response.ok) return fallbackSchedule(answers)
  const body = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const parts = body.candidates?.[0]?.content?.parts ?? []
  const content = parts.map((p) => p.text ?? '').join('')
  if (!content) return fallbackSchedule(answers)
  try {
    const rawSchedule = parseSchedule(content).slice(0, 4)
    const slots = rawSchedule.map((item, i) => coerceSlot(item, i, answers))
    if (!slots.length) return fallbackSchedule(answers)
    return balanceDurations(slots, answers.daily_minutes)
  } catch {
    return fallbackSchedule(answers)
  }
}

export async function generateFitnessPlanServer(raw: Record<string, unknown>) {
  const answers = normalizeAnswers(raw)
  const apiKey = (process.env.GEMINI_API_KEY ?? '').trim()
  const model = (process.env.GEMINI_MODEL ?? 'gemini-3.8-flash').trim()
  const schedule = apiKey
    ? await geminiSchedule(answers, apiKey, model)
    : fallbackSchedule(answers)
  return {
    fitness_level: answers.fitness_level,
    goal: answers.goal,
    daily_minutes: answers.daily_minutes,
    preferred_windows: answers.preferred_windows,
    focus_areas: answers.focus_areas,
    schedule,
    source: apiKey ? 'ai' : 'personalized',
  }
}
