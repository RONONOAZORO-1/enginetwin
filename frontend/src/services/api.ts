import type { SimulationResponse, WhatIfDeltas, WhatIfResponse } from '../types/engine'

const BASE = '/api'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail ?? detail
    } catch {
      // response wasn't JSON - fall back to statusText
    }
    throw new ApiError(detail, res.status)
  }
  return res.json() as Promise<T>
}

export async function checkHealth(): Promise<{ status: string; mode: string }> {
  const res = await fetch(`${BASE}/health`)
  return handle(res)
}

export async function getModelConfig(): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}/model-config`)
  return handle(res)
}

export async function simulate(file: File, engineId = 'PX-001'): Promise<SimulationResponse> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/simulate?engine_id=${encodeURIComponent(engineId)}`, {
    method: 'POST',
    body: form,
  })
  return handle(res)
}

export async function whatIf(sessionId: string, deltas: WhatIfDeltas): Promise<WhatIfResponse> {
  const res = await fetch(`${BASE}/what-if?session_id=${encodeURIComponent(sessionId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(deltas),
  })
  return handle(res)
}
