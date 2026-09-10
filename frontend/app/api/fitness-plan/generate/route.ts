import { NextResponse } from 'next/server'
import { generateFitnessPlanServer } from '../../../../lib/server/planGeneration'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>
    const plan = await generateFitnessPlanServer(body)
    return NextResponse.json(plan)
  } catch {
    return NextResponse.json({ detail: 'Could not generate fitness plan' }, { status: 500 })
  }
}
