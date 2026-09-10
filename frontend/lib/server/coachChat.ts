const COACH_SYSTEM = `You are Grid Coach, MOVEGRID's friendly movement and fitness assistant.
You help users with workout struggles, motivation, soreness, scheduling, habit building,
and understanding their daily movement plan. Keep answers practical, encouraging, and concise
(2–4 short paragraphs max unless they ask for detail). You are not a doctor; suggest seeing
a professional for pain, injury, or medical concerns. Prefer bodyweight and no-equipment ideas
when suggesting exercises.`

export type CoachTurn = { role: string; content: string }

export type CoachContext = {
  fitness_level?: string
  goal?: string
  daily_minutes?: number
  focus_areas?: string[]
}

function geminiModelId(raw: string) {
  const model = (raw || 'gemini-3.8-flash').trim()
  return model.startsWith('models/') ? model.slice('models/'.length) : model
}

function buildContents(message: string, history: CoachTurn[], context?: CoachContext | null) {
  const contents: { role: string; parts: { text: string }[] }[] = []
  for (const turn of history.slice(-12)) {
    const text = turn.content?.trim()
    if (!text) continue
    const role = turn.role === 'assistant' || turn.role === 'model' ? 'model' : 'user'
    contents.push({ role, parts: [{ text }] })
  }
  let userText = message.trim()
  if (context) {
    const bits: string[] = []
    if (context.fitness_level) bits.push(`Fitness level: ${context.fitness_level}`)
    if (context.goal) bits.push(`Goal: ${context.goal}`)
    if (context.daily_minutes) bits.push(`Daily movement budget: ${context.daily_minutes} min`)
    if (context.focus_areas?.length) bits.push(`Focus areas: ${context.focus_areas.join(', ')}`)
    if (bits.length) userText = `[User context: ${bits.join('; ')}]\n\n${userText}`
  }
  contents.push({ role: 'user', parts: [{ text: userText }] })
  return contents
}

export async function coachChatServer(
  message: string,
  history: CoachTurn[],
  context?: CoachContext | null,
): Promise<{ reply: string }> {
  const text = message.trim()
  if (!text) {
    return { reply: "Tell me what's going on — I'm here to help with your movement goals." }
  }

  const apiKey = (process.env.GEMINI_API_KEY ?? '').trim()
  if (!apiKey) {
    return {
      reply:
        "Grid Coach isn't connected yet (missing GEMINI_API_KEY). Add it to your server env and try again.",
    }
  }

  const modelId = geminiModelId(process.env.GEMINI_MODEL ?? 'gemini-3.8-flash')
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: COACH_SYSTEM }] },
      contents: buildContents(text, history, context),
      generationConfig: { temperature: 0.75, maxOutputTokens: 1024 },
    }),
  })

  if (!response.ok) {
    return { reply: "I couldn't reach the coach service right now. Please try again in a moment." }
  }

  const body = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const parts = body.candidates?.[0]?.content?.parts ?? []
  const reply = parts.map((p) => p.text ?? '').join('').trim()
  if (!reply) {
    return { reply: "I didn't get a clear answer — could you rephrase your question?" }
  }
  return { reply }
}
