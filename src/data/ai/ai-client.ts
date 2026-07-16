/** The AI provider port. Ollama implements it; tests use a fake. Retrieval-only usage. */
export interface AiClient {
  /** Whether the local model runtime is reachable right now. */
  isAvailable(): Promise<boolean>
  /** Generate a completion for a prompt with the given model. */
  generate(prompt: string, model: string): Promise<string>
}
