/**
 * Ollama over localhost. Runs in the data worker. Cross-origin, so the user must allow this
 * origin via `OLLAMA_ORIGINS` (or the Ollama app's "expose to network" toggle). Non-streaming
 * for v1. If Ollama is down or blocked, `isAvailable` returns false and the app degrades.
 */
import type { AiClient } from './ai-client'

interface GenerateResponse {
  response?: string
}

export class OllamaClient implements AiClient {
  constructor(private readonly baseUrl: string = 'http://localhost:11434') {}

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`)
      return res.ok
    } catch {
      return false
    }
  }

  async generate(prompt: string, model: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
    })
    if (!res.ok) {
      throw new Error(`Ollama request failed (${res.status}). Is the model "${model}" pulled?`)
    }
    const data = (await res.json()) as GenerateResponse
    return data.response ?? ''
  }
}
