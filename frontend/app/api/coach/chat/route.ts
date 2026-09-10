import { NextResponse } from 'next/server'
import { coachChatServer, type CoachContext, type CoachTurn } from '../../../../lib/server/coachChat'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message?: string
      history?: CoachTurn[]
      context?: CoachContext | null
    }
    const result = await coachChatServer(body.message ?? '', body.history ?? [], body.context)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ detail: 'Coach chat failed' }, { status: 500 })
  }
}
