const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"

export type ApiMission = { id: number; title: string; description: string; zone: string; move_reward: number; minutes: number; kind: string }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } })
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.detail ?? "MOVEGRID API request failed")
  return response.json()
}

export const movegridApi = {
  missions: () => request<ApiMission[]>("/missions"),
  leaderboard: () => request<{ name: string; move: number }[]>("/leaderboard"),
  rewards: () => request<unknown[]>("/rewards"),
  analytics: () => request<{ movement_generated: number; active_students: number; missions_completed: number; engagement_rate: number }>("/admin/analytics"),
  completeMission: (id: number, code = "movegrid-demo") => request(`/missions/${id}/complete`, { method: "POST", body: JSON.stringify({ code }) }),
}
