import OpenAI from "openai";

// Singleton OpenAI client pointing to Ollama's OpenAI-compatible endpoint
let client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "ollama",
      baseURL: process.env.LLM_ENDPOINT || "http://localhost:11434/v1",
    });
  }
  return client;
}
